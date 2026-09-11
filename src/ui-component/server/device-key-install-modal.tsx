import { type JSX, useEffect, useRef, useState } from 'react'
import { Modal, Pressable, StyleSheet, View } from 'react-native'
import { Button, Text, TextInput } from 'react-native-paper'

import { type HostConfig } from '#src/business/model/host-config'
import { HostKeyMismatchError } from '#src/business/model/host-key'
import { type ServerDraft } from '#src/business/model/server-draft'
import { serverConnectUseCase } from '#src/business/use-case/server-connect-use-case'
import { useThemePreference } from '#src/ui-component/theme/theme-context'

const SCRIM_COLOR = 'rgba(0, 0, 0, 0.5)'

type InstallStatus = { kind: 'failed'; message: string } | { kind: 'idle' } | { kind: 'installing' }

interface DeviceKeyInstallModalProps {
  draft: ServerDraft | undefined
  existingConfig: HostConfig | undefined
  isVisible: boolean
  onCancel: () => void
  onInstalled: (draft: ServerDraft) => void
}

export const DeviceKeyInstallModal = (props: DeviceKeyInstallModalProps): JSX.Element => {
  const { md3Theme } = useThemePreference()
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<InstallStatus>({ kind: 'idle' })
  const promptState = useRef({ isPromptActive: false })

  useEffect(() => {
    if (!props.isVisible) {
      return undefined
    }
    setPassword('')
    setStatus({ kind: 'idle' })

    return serverConnectUseCase.subscribeToVerification((verification) => {
      promptState.current.isPromptActive = verification.status === 'pending'
    })
  }, [props.isVisible])

  const isBusy = status.kind === 'installing'

  const handleInstallPress = (): void => {
    const draft = props.draft
    if (!draft || isBusy) {
      return
    }
    setStatus({ kind: 'installing' })
    void serverConnectUseCase
      .installDeviceKey({ draft, existingConfig: props.existingConfig, password })
      .then(() => {
        setStatus({ kind: 'idle' })
        props.onInstalled(draft)
      })
      .catch((error: unknown) => {
        if (error instanceof HostKeyMismatchError || promptState.current.isPromptActive) {
          setStatus({ kind: 'idle' })

          return
        }
        setStatus({ kind: 'failed', message: `Key install failed: ${String(error)}` })
      })
  }

  const handleRequestClose = (): void => {
    if (isBusy) {
      return
    }
    props.onCancel()
  }

  const absorbCardPress = (): void => {
    return undefined
  }

  const renderStatus = (): JSX.Element | null => {
    switch (status.kind) {
      case 'failed': {
        return <Text style={[styles.errorMessage, { color: md3Theme.colors.error }]}>{status.message}</Text>
      }
      case 'idle': {
        return null
      }
      case 'installing': {
        return <Text style={[styles.hintMessage, { color: md3Theme.colors.onSurfaceVariant }]}>Installing key…</Text>
      }
    }
  }

  return (
    <Modal animationType="fade" onRequestClose={handleRequestClose} transparent visible={props.isVisible}>
      <Pressable onPress={handleRequestClose} style={[styles.overlay, { backgroundColor: SCRIM_COLOR }]}>
        <Pressable onPress={absorbCardPress} style={styles.cardWrap}>
          <View
            style={[
              styles.card,
              { backgroundColor: md3Theme.colors.surface, borderColor: md3Theme.colors.outlineVariant },
            ]}
          >
            <Text style={styles.title} variant="headlineSmall">
              Authenticate device key
            </Text>
            <Text style={[styles.hintMessage, { color: md3Theme.colors.onSurfaceVariant }]}>
              Installs this device&apos;s public key on the server with your password, then verifies the connection.
            </Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              label="Password"
              mode="outlined"
              onChangeText={(text) => {
                setPassword(text)
              }}
              placeholder="Server password"
              secureTextEntry
              value={password}
            />
            <Button
              disabled={password === '' || isBusy}
              mode="contained"
              onPress={handleInstallPress}
              style={styles.installButton}
            >
              Install key on server
            </Button>
            {renderStatus()}
            <View style={styles.actions}>
              <Button disabled={isBusy} onPress={handleRequestClose}>
                Close
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
    paddingTop: 8,
  },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
    maxWidth: 480,
    overflow: 'hidden',
    paddingBottom: 12,
    paddingHorizontal: 16,
    width: '100%',
  },
  cardWrap: {
    width: '88%',
  },
  errorMessage: {
    fontSize: 13,
  },
  hintMessage: {
    fontSize: 13,
  },
  installButton: {
    marginTop: 4,
  },
  overlay: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    paddingBottom: 4,
    paddingTop: 16,
  },
})
