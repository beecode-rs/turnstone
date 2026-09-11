import { type JSX, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Button, List, Switch, Text } from 'react-native-paper'

import { type HostConfig } from '#src/business/model/host-config'
import { type ServerDraft } from '#src/business/model/server-draft'
import { type ServerBrowseSession, serverConnectUseCase } from '#src/business/use-case/server-connect-use-case'
import { SettingsRow } from '#src/ui-component/settings/settings-row'
import { useThemePreference } from '#src/ui-component/theme/theme-context'
import { remotePathUtil } from '#src/util/remote-path-util'

const ROOT_PATH = '/'
const SCRIM_COLOR = 'rgba(0, 0, 0, 0.5)'

type FolderBrowserPhase = { kind: 'connecting' } | { kind: 'failed'; message: string } | { kind: 'ready' }

interface FolderBrowserModalProps {
  draft: ServerDraft | undefined
  existingConfig: HostConfig | undefined
  initialPath: string
  isVisible: boolean
  onCancel: () => void
  onSelect: (path: string) => void
}

export const FolderBrowserModal = (props: FolderBrowserModalProps): JSX.Element => {
  const { md3Theme } = useThemePreference()
  const sessionRef = useRef<ServerBrowseSession | null>(null)
  const [currentPath, setCurrentPath] = useState(ROOT_PATH)
  const [folderNames, setFolderNames] = useState<string[]>([])
  const [isDotFoldersVisible, setIsDotFoldersVisible] = useState(false)
  const [isListing, setIsListing] = useState(false)
  const [phase, setPhase] = useState<FolderBrowserPhase>({ kind: 'connecting' })
  const [listingError, setListingError] = useState<string | null>(null)

  useEffect(() => {
    if (!props.isVisible || !props.draft) {
      return undefined
    }
    const cancelState = { isCancelled: false }
    const initialPath = remotePathUtil.normalizeRootPath({ path: props.initialPath })
    setPhase({ kind: 'connecting' })
    setCurrentPath(ROOT_PATH)
    setFolderNames([])
    setIsDotFoldersVisible(false)
    setIsListing(false)
    setListingError(null)

    const loadInitialDirectories = async (): Promise<{ folderNames: string[]; path: string }> => {
      const session = sessionRef.current
      if (!session) {
        throw new Error('Browse session is not open')
      }
      try {
        const initialNames = await session.listDirectories({ path: initialPath })

        return { folderNames: initialNames, path: initialPath }
      } catch {
        const rootNames = await session.listDirectories({ path: ROOT_PATH })

        return { folderNames: rootNames, path: ROOT_PATH }
      }
    }

    void serverConnectUseCase
      .openBrowseSession({ draft: props.draft, existingConfig: props.existingConfig })
      .then((session) => {
        if (cancelState.isCancelled) {
          session.disconnect()

          return undefined
        }
        sessionRef.current = session
        setIsListing(true)

        return loadInitialDirectories()
      })
      .then((result) => {
        if (cancelState.isCancelled || !result) {
          return undefined
        }
        setCurrentPath(result.path)
        setFolderNames(result.folderNames)
        setPhase({ kind: 'ready' })
        setIsListing(false)
      })
      .catch((error: unknown) => {
        if (cancelState.isCancelled) {
          return undefined
        }
        setPhase({ kind: 'failed', message: String(error) })
        setIsListing(false)
      })

    return () => {
      cancelState.isCancelled = true
      sessionRef.current?.disconnect()
      sessionRef.current = null
    }
  }, [props.draft, props.existingConfig, props.initialPath, props.isVisible])

  const navigateTo = (params: { path: string }): Promise<void> => {
    const session = sessionRef.current
    if (!session || isListing) {
      return Promise.resolve()
    }
    setIsListing(true)
    setListingError(null)

    return session
      .listDirectories({ path: params.path })
      .then((names) => {
        setCurrentPath(params.path)
        setFolderNames(names)
      })
      .catch((error: unknown) => {
        setListingError(String(error))
      })
      .finally(() => {
        setIsListing(false)
      })
  }

  const handleFolderPress = (folderName: string): void => {
    void navigateTo({ path: remotePathUtil.join({ dir: currentPath, name: folderName }) })
  }

  const handleParentPress = (): void => {
    void navigateTo({ path: remotePathUtil.toParentDir({ path: currentPath }) })
  }

  const handleSelect = (): void => {
    props.onSelect(currentPath)
  }

  const handleDotFoldersSwitchValueChange = (nextValue: boolean): void => {
    setIsDotFoldersVisible(nextValue)
  }

  const absorbCardPress = (): void => {
    return undefined
  }

  const renderParentRow = (): JSX.Element | null => {
    if (currentPath === ROOT_PATH) {
      return null
    }

    return (
      <List.Item
        left={() => {
          return <List.Icon icon="arrow-up" />
        }}
        onPress={handleParentPress}
        title=".."
      />
    )
  }

  const renderFolderRow = (folderName: string): JSX.Element => {
    return (
      <List.Item
        key={folderName}
        left={() => {
          return <List.Icon icon="folder" />
        }}
        onPress={() => {
          handleFolderPress(folderName)
        }}
        title={folderName}
      />
    )
  }

  const renderListing = (): JSX.Element => {
    const visibleFolderNames = folderNames.filter((folderName) => {
      if (isDotFoldersVisible) {
        return true
      }

      return !folderName.startsWith('.')
    })

    return (
      <View>
        {isListing && <ActivityIndicator color={md3Theme.colors.primary} style={styles.listingSpinner} />}
        {listingError !== null && (
          <Text style={[styles.errorMessage, { color: md3Theme.colors.error }]}>{listingError}</Text>
        )}
        {renderParentRow()}
        {visibleFolderNames.map((folderName) => {
          return renderFolderRow(folderName)
        })}
        {visibleFolderNames.length === 0 && !isListing && (
          <Text style={[styles.hintMessage, { color: md3Theme.colors.onSurfaceVariant }]}>No subfolders</Text>
        )}
      </View>
    )
  }

  const renderCurrentPath = (): JSX.Element | null => {
    if (phase.kind !== 'ready') {
      return null
    }

    return (
      <Text numberOfLines={1} style={[styles.currentPath, { color: md3Theme.colors.onSurfaceVariant }]}>
        {currentPath}
      </Text>
    )
  }

  const renderContent = (): JSX.Element => {
    switch (phase.kind) {
      case 'connecting': {
        return (
          <View style={styles.phaseBox}>
            <ActivityIndicator color={md3Theme.colors.primary} />
            <Text style={[styles.hintMessage, { color: md3Theme.colors.onSurfaceVariant }]}>Connecting…</Text>
          </View>
        )
      }
      case 'failed': {
        return (
          <View style={styles.phaseBox}>
            <Text style={[styles.errorMessage, { color: md3Theme.colors.error }]}>{phase.message}</Text>
          </View>
        )
      }
      case 'ready': {
        return renderListing()
      }
    }
  }

  return (
    <Modal animationType="fade" onRequestClose={props.onCancel} transparent visible={props.isVisible}>
      <Pressable onPress={props.onCancel} style={[styles.overlay, { backgroundColor: SCRIM_COLOR }]}>
        <Pressable onPress={absorbCardPress} style={styles.cardWrap}>
          <View
            style={[
              styles.card,
              { backgroundColor: md3Theme.colors.surface, borderColor: md3Theme.colors.outlineVariant },
            ]}
          >
            <Text style={styles.title} variant="headlineSmall">
              Browse folders
            </Text>
            <View style={styles.toggleRowWrap}>
              <SettingsRow
                control={<Switch onValueChange={handleDotFoldersSwitchValueChange} value={isDotFoldersVisible} />}
                label="Show dot folders"
              />
            </View>
            {renderCurrentPath()}
            <ScrollView contentContainerStyle={styles.listContent} style={styles.list}>
              {renderContent()}
            </ScrollView>
            <View style={styles.actions}>
              <Button onPress={props.onCancel}>Cancel</Button>
              <Button disabled={phase.kind !== 'ready'} onPress={handleSelect}>
                Use this folder
              </Button>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    paddingBottom: 8,
    paddingHorizontal: 8,
  },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 480,
    overflow: 'hidden',
    width: '100%',
  },
  cardWrap: {
    width: '88%',
  },
  currentPath: {
    fontFamily: 'jetBrainsMonoRegular',
    fontSize: 13,
    paddingBottom: 4,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  errorMessage: {
    fontSize: 13,
    paddingBottom: 8,
  },
  hintMessage: {
    fontSize: 13,
    paddingBottom: 12,
    paddingTop: 4,
  },
  list: {
    maxHeight: 360,
  },
  listContent: {
    paddingBottom: 8,
    paddingHorizontal: 8,
  },
  listingSpinner: {
    padding: 8,
  },
  overlay: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  phaseBox: {
    alignItems: 'center',
    gap: 12,
    padding: 24,
  },
  title: {
    paddingBottom: 8,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  toggleRowWrap: {
    paddingHorizontal: 20,
  },
})
