import Constants from 'expo-constants'
import { router } from 'expo-router'
import { type JSX, useEffect, useRef, useState } from 'react'
import { StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { type HostConfig } from '#src/business/model/host-config'
import { HostKeyMismatchError, type HostKeyVerification } from '#src/business/model/host-key'
import { type ServerDraft } from '#src/business/model/server-draft'
import { serverAdminUseCase } from '#src/business/use-case/server-admin-use-case'
import { serverConnectUseCase } from '#src/business/use-case/server-connect-use-case'
import { AppIdentityTitle } from '#src/ui-component/app-identity-title'
import { CollapsibleTopBar } from '#src/ui-component/collapsible-top-bar'
import { ConfirmModal } from '#src/ui-component/confirm-modal'
import { FingerprintModal } from '#src/ui-component/server/fingerprint-modal'
import { ServerForm, type ServerFormStatus } from '#src/ui-component/server/server-form'
import { ServerList } from '#src/ui-component/server/server-list'
import { useThemePreference } from '#src/ui-component/theme/theme-context'
import { draftHostIdUtil } from '#src/util/draft-host-id-util'

export const ServersController = (): JSX.Element => {
  const { navigationTheme } = useThemePreference()
  const appName = Constants.expoConfig?.name ?? 'Turnstone'
  const [connectTarget, setConnectTarget] = useState<HostConfig | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<HostConfig | undefined>(undefined)
  const [cloningConfig, setCloningConfig] = useState<HostConfig | undefined>(undefined)
  const [editingConfig, setEditingConfig] = useState<HostConfig | undefined>(undefined)
  const [formStatus, setFormStatus] = useState<ServerFormStatus>({ kind: 'idle' })
  const [isFormVisible, setIsFormVisible] = useState(false)
  const [servers, setServers] = useState<HostConfig[]>([])
  const [verification, setVerification] = useState<HostKeyVerification | null>(null)
  const connectState = useRef({ isPromptActive: false, isUserAbort: false })

  useEffect(() => {
    setServers(serverAdminUseCase.listServers())
  }, [])

  useEffect(() => {
    return serverConnectUseCase.subscribeToVerification((nextVerification) => {
      connectState.current.isPromptActive = nextVerification.status === 'pending'
      setVerification(nextVerification)
    })
  }, [])

  const reloadServers = (): void => {
    setServers(serverAdminUseCase.listServers())
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

  const handlePressAbout = (): void => {
    router.navigate({ pathname: '/about' })
  }

  const handlePressSettings = (): void => {
    router.navigate({ pathname: '/settings' })
  }

  const handleAddPress = (): void => {
    setCloningConfig(undefined)
    setEditingConfig(undefined)
    setFormStatus({ kind: 'idle' })
    setIsFormVisible(true)
  }

  const handleEditPress = (server: HostConfig): void => {
    setCloningConfig(undefined)
    setEditingConfig(server)
    setFormStatus({ kind: 'idle' })
    setIsFormVisible(true)
  }

  const handleClonePress = (server: HostConfig): void => {
    setEditingConfig(undefined)
    setCloningConfig({ ...server, label: `${server.label} (copy)` })
    setFormStatus({ kind: 'idle' })
    setIsFormVisible(true)
  }

  const handleFormCancel = (): void => {
    setIsFormVisible(false)
    setCloningConfig(undefined)
    setFormStatus({ kind: 'idle' })
  }

  const handleFormSubmit = (draft: ServerDraft): void => {
    void serverAdminUseCase
      .saveServer({ draft, existingConfig: editingConfig })
      .then(() => {
        setIsFormVisible(false)
        setCloningConfig(undefined)
        setFormStatus({ kind: 'idle' })
        reloadServers()
      })
      .catch((error: unknown) => {
        setFormStatus({ kind: 'failed', message: `Save failed: ${String(error)}` })
      })
  }

  const buildTestTarget = (draft: ServerDraft): HostConfig => {
    return {
      authMethod: draft.authMethod,
      host: draft.host,
      id:
        editingConfig?.id ??
        draftHostIdUtil.forConnection({ host: draft.host, port: draft.port, username: draft.username }),
      label: draft.label,
      port: draft.port,
      username: draft.username,
    }
  }

  const handleFormTest = (draft: ServerDraft): void => {
    setConnectTarget(buildTestTarget(draft))
    setFormStatus({ kind: 'testing' })
    void serverConnectUseCase
      .testConnection({ draft, existingConfig: editingConfig })
      .then(() => {
        setConnectTarget(undefined)
        setFormStatus({ kind: 'succeeded' })
      })
      .catch((error: unknown) => {
        handleTestFailure(error)
      })
  }

  const handleTestFailure = (error: unknown): void => {
    if (error instanceof HostKeyMismatchError) {
      setFormStatus({ kind: 'idle' })

      return
    }
    if (connectState.current.isPromptActive) {
      return
    }
    setConnectTarget(undefined)
    setFormStatus({ kind: 'failed', message: String(error) })
  }

  const handleFormInstallStart = (draft: ServerDraft): void => {
    setConnectTarget(buildTestTarget(draft))
  }

  const handleFormInstallEnd = (): void => {
    setConnectTarget(undefined)
  }

  const handleDeleteCancel = (): void => {
    setDeleteTarget(undefined)
  }

  const handleDeleteConfirm = (): void => {
    if (!deleteTarget) {
      return
    }
    const hostId = deleteTarget.id
    setDeleteTarget(undefined)
    void serverAdminUseCase.removeServer({ hostId }).then(() => {
      reloadServers()
    })
  }

  const handleDeletePress = (server: HostConfig): void => {
    setDeleteTarget(server)
  }

  const handleServerPress = (server: HostConfig): void => {
    router.navigate({ params: { host: server.id }, pathname: '/projects/[host]' })
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
    setConnectTarget(undefined)
    setVerification(null)
  }

  const handleCloseMismatch = (): void => {
    if (connectTarget) {
      connectState.current.isUserAbort = true
      connectState.current.isPromptActive = false
      serverConnectUseCase.disconnect({ hostId: connectTarget.id })
    }
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
    setConnectTarget(undefined)
    setVerification(null)
  }

  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={[styles.safeArea, { backgroundColor: navigationTheme.colors.background }]}
    >
      <CollapsibleTopBar
        actions={[{ icon: 'plus', key: 'add-server', onPress: handleAddPress, tip: 'Add server' }]}
        onPressAbout={handlePressAbout}
        onPressSettings={handlePressSettings}
        title={<AppIdentityTitle appName={appName} />}
      />
      <ServerList
        onPressAdd={handleAddPress}
        onPressClone={handleClonePress}
        onPressDelete={handleDeletePress}
        onPressEdit={handleEditPress}
        onPressServer={handleServerPress}
        servers={servers}
      />
      <ServerForm
        editingConfig={editingConfig}
        isVisible={isFormVisible}
        onCancel={handleFormCancel}
        onInstallEnd={handleFormInstallEnd}
        onInstallStart={handleFormInstallStart}
        onSubmit={handleFormSubmit}
        onTest={handleFormTest}
        prefillConfig={cloningConfig}
        status={formStatus}
      />
      <ConfirmModal
        confirmLabel="Delete"
        isDestructive
        isVisible={deleteTarget !== undefined}
        message={`Remove "${deleteTarget?.label ?? ''}" and its stored credentials?`}
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete server"
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
