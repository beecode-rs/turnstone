import { router, useLocalSearchParams } from 'expo-router'
import { type JSX, useEffect, useRef, useState } from 'react'
import { Alert, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { type HostConfig } from '#src/business/model/host-config'
import { HostKeyMismatchError, type HostKeyVerification } from '#src/business/model/host-key'
import { type ProjectConfig } from '#src/business/model/project-config'
import { type ProjectDraft } from '#src/business/model/project-draft'
import { projectAdminUseCase } from '#src/business/use-case/project-admin-use-case'
import { serverAdminUseCase } from '#src/business/use-case/server-admin-use-case'
import { serverConnectUseCase } from '#src/business/use-case/server-connect-use-case'
import { CollapsibleTopBar } from '#src/ui-component/collapsible-top-bar'
import { ConfirmModal } from '#src/ui-component/confirm-modal'
import { ProjectForm } from '#src/ui-component/project/project-form'
import { ProjectList } from '#src/ui-component/project/project-list'
import { ConnectingOverlay } from '#src/ui-component/server/connecting-overlay'
import { FingerprintModal } from '#src/ui-component/server/fingerprint-modal'
import { useThemePreference } from '#src/ui-component/theme/theme-context'

export const ProjectsController = (): JSX.Element => {
  const { host } = useLocalSearchParams<{ host: string }>()
  const { navigationTheme } = useThemePreference()
  const [connectingProject, setConnectingProject] = useState<ProjectConfig | undefined>(undefined)
  const [connectTarget, setConnectTarget] = useState<HostConfig | undefined>(undefined)
  const [cloningProject, setCloningProject] = useState<ProjectConfig | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<ProjectConfig | undefined>(undefined)
  const [editingProject, setEditingProject] = useState<ProjectConfig | undefined>(undefined)
  const [isFormVisible, setIsFormVisible] = useState(false)
  const [projects, setProjects] = useState<ProjectConfig[]>([])
  const [server, setServer] = useState<HostConfig | undefined>(undefined)
  const [verification, setVerification] = useState<HostKeyVerification | null>(null)
  const connectState = useRef({ isPromptActive: false, isUserAbort: false })

  useEffect(() => {
    setServer(
      serverAdminUseCase.listServers().find((serverConfig) => {
        return serverConfig.id === host
      }),
    )
    setProjects(projectAdminUseCase.listProjects({ hostId: host }))
  }, [host])

  useEffect(() => {
    return serverConnectUseCase.subscribeToVerification((nextVerification) => {
      connectState.current.isPromptActive = nextVerification.status === 'pending'
      setVerification(nextVerification)
    })
  }, [])

  const reloadProjects = (): void => {
    setProjects(projectAdminUseCase.listProjects({ hostId: host }))
  }

  const resolveActiveVerification = (): HostKeyVerification | null => {
    if (!connectTarget) {
      return null
    }
    if (!verification) {
      return null
    }
    if (verification.hostId !== connectTarget.id) {
      return null
    }
    if (verification.status === 'trusted') {
      return null
    }

    return verification
  }

  const resolveTitle = (): string => {
    if (!server) {
      return 'Projects'
    }

    return `Projects (${server.label})`
  }

  const handlePressAbout = (): void => {
    router.navigate({ pathname: '/about' })
  }

  const handlePressSettings = (): void => {
    router.navigate({ pathname: '/settings' })
  }

  const handleBackPress = (): void => {
    router.back()
  }

  const handleAddPress = (): void => {
    setCloningProject(undefined)
    setEditingProject(undefined)
    setIsFormVisible(true)
  }

  const handleClonePress = (project: ProjectConfig): void => {
    setCloningProject({ ...project, name: `${project.name} (copy)` })
    setEditingProject(undefined)
    setIsFormVisible(true)
  }

  const handleEditPress = (project: ProjectConfig): void => {
    setCloningProject(undefined)
    setEditingProject(project)
    setIsFormVisible(true)
  }

  const handleFormCancel = (): void => {
    setIsFormVisible(false)
    setCloningProject(undefined)
    setEditingProject(undefined)
  }

  const handleFormSubmit = (draft: ProjectDraft): void => {
    projectAdminUseCase.saveProject({ draft, existingProject: editingProject, hostId: host })
    setIsFormVisible(false)
    setCloningProject(undefined)
    setEditingProject(undefined)
    reloadProjects()
  }

  const handleDeleteCancel = (): void => {
    setDeleteTarget(undefined)
  }

  const handleDeleteConfirm = (): void => {
    if (!deleteTarget) {
      return
    }
    const projectId = deleteTarget.id
    setDeleteTarget(undefined)
    projectAdminUseCase.removeProject({ projectId })
    reloadProjects()
  }

  const handleDeletePress = (project: ProjectConfig): void => {
    setDeleteTarget(project)
  }

  const handleConnectFailure = (error: unknown): void => {
    if (connectState.current.isUserAbort) {
      return
    }
    if (error instanceof HostKeyMismatchError) {
      return
    }
    if (connectState.current.isPromptActive) {
      return
    }
    setConnectingProject(undefined)
    setConnectTarget(undefined)
    Alert.alert('Connect failed', String(error))
  }

  const handleProjectPress = (project: ProjectConfig): void => {
    if (connectingProject !== undefined || !server) {
      return
    }
    connectState.current.isUserAbort = false
    setConnectingProject(project)
    setConnectTarget(server)
    void serverConnectUseCase
      .connect({ hostId: server.id })
      .then(() => {
        projectAdminUseCase.setActiveProject({ hostId: server.id, projectId: project.id })
        setConnectingProject(undefined)
        setConnectTarget(undefined)
        setVerification(null)
        router.navigate({ params: { host: server.id, project: project.id }, pathname: '/tree/[host]' })
      })
      .catch((error: unknown) => {
        handleConnectFailure(error)
      })
  }

  const handleAcceptHostKey = (): void => {
    if (!connectTarget) {
      return
    }
    connectState.current.isPromptActive = false
    void serverConnectUseCase.acceptHostKey({ hostId: connectTarget.id })
  }

  const handleRejectHostKey = (): void => {
    if (!connectTarget) {
      return
    }
    connectState.current.isUserAbort = true
    connectState.current.isPromptActive = false
    serverConnectUseCase.rejectHostKey({ hostId: connectTarget.id })
    setConnectingProject(undefined)
    setConnectTarget(undefined)
    setVerification(null)
  }

  const handleCloseMismatch = (): void => {
    if (connectTarget) {
      connectState.current.isUserAbort = true
      connectState.current.isPromptActive = false
      serverConnectUseCase.disconnect({ hostId: connectTarget.id })
    }
    setConnectingProject(undefined)
    setConnectTarget(undefined)
    setVerification(null)
  }

  const handleRemoveStoredHostKey = (): void => {
    if (!connectTarget) {
      return
    }
    connectState.current.isUserAbort = true
    connectState.current.isPromptActive = false
    serverConnectUseCase.disconnect({ hostId: connectTarget.id })
    void serverConnectUseCase.removeStoredHostKey({ hostId: connectTarget.id })
    setConnectingProject(undefined)
    setConnectTarget(undefined)
    setVerification(null)
  }

  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={[styles.safeArea, { backgroundColor: navigationTheme.colors.background }]}
    >
      <CollapsibleTopBar
        actions={[{ icon: 'plus', key: 'add-project', onPress: handleAddPress, tip: 'Add project' }]}
        onPressAbout={handlePressAbout}
        onPressBack={handleBackPress}
        onPressSettings={handlePressSettings}
        title={resolveTitle()}
      />
      <ProjectList
        onPressAdd={handleAddPress}
        onPressClone={handleClonePress}
        onPressDelete={handleDeletePress}
        onPressEdit={handleEditPress}
        onPressProject={handleProjectPress}
        projects={projects}
      />
      <ConnectingOverlay project={connectingProject} server={connectTarget} />
      <ProjectForm
        editingProject={editingProject}
        hostConfig={server}
        isVisible={isFormVisible}
        onCancel={handleFormCancel}
        onSubmit={handleFormSubmit}
        prefillProject={cloningProject}
      />
      <ConfirmModal
        confirmLabel="Delete"
        isDestructive
        isVisible={deleteTarget !== undefined}
        message={`Remove "${deleteTarget?.name ?? ''}" from this server?`}
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete project"
      />
      <FingerprintModal
        hostLabel={connectTarget?.label ?? ''}
        onAcceptHostKey={handleAcceptHostKey}
        onCloseMismatch={handleCloseMismatch}
        onRejectHostKey={handleRejectHostKey}
        onRemoveStoredHostKey={handleRemoveStoredHostKey}
        verification={resolveActiveVerification()}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
})
