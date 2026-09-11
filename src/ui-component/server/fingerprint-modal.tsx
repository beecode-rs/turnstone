import { type JSX } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Button } from 'react-native-paper'

import { type HostKeyVerification } from '#src/business/model/host-key'
import { useThemePreference } from '#src/ui-component/theme/theme-context'

const SCRIM_COLOR = 'rgba(0, 0, 0, 0.5)'

interface FingerprintModalProps {
  hostLabel: string
  onAcceptHostKey: () => void
  onCloseMismatch: () => void
  onRejectHostKey: () => void
  onRemoveStoredHostKey: () => void
  verification: HostKeyVerification | null
}

export const FingerprintModal = (props: FingerprintModalProps): JSX.Element => {
  const { md3Theme } = useThemePreference()
  const isMismatch = props.verification?.status === 'mismatch'
  const isPending = props.verification?.status === 'pending'
  const isVisible = isMismatch || isPending

  const resolveTitle = (): string => {
    if (isMismatch) {
      return 'Host key mismatch'
    }

    return 'Verify host key'
  }

  const handleRequestClose = (): void => {
    if (isPending) {
      props.onRejectHostKey()

      return
    }
    props.onCloseMismatch()
  }

  const absorbCardPress = (): void => {
    return undefined
  }

  const renderPendingBody = (): JSX.Element | null => {
    if (props.verification?.status !== 'pending') {
      return null
    }

    return (
      <>
        <Text style={[styles.message, { color: md3Theme.colors.onSurface }]}>
          The authenticity of this server is not confirmed yet. Compare the fingerprint below with the one from your
          server administrator before accepting it.
        </Text>
        <Text style={[styles.fingerprintLabel, { color: md3Theme.colors.onSurfaceVariant }]}>
          Presented fingerprint
        </Text>
        <Text selectable style={[styles.fingerprintValue, { color: md3Theme.colors.onSurface }]}>
          {props.verification.presentedFingerprint}
        </Text>
      </>
    )
  }

  const renderMismatchBody = (): JSX.Element | null => {
    if (props.verification?.status !== 'mismatch') {
      return null
    }

    return (
      <>
        <Text style={[styles.warning, { color: md3Theme.colors.error }]}>
          The host key presented by this server has changed. This can indicate a man-in-the-middle attack, so the
          connection was blocked. If you expected this change, remove the stored key. On the next connection you will
          verify the new fingerprint, as on a first connection.
        </Text>
        <Text style={[styles.fingerprintLabel, { color: md3Theme.colors.onSurfaceVariant }]}>Stored fingerprint</Text>
        <Text selectable style={[styles.fingerprintValue, { color: md3Theme.colors.onSurface }]}>
          {props.verification.expectedFingerprint}
        </Text>
        <Text style={[styles.fingerprintLabel, { color: md3Theme.colors.onSurfaceVariant }]}>
          Presented fingerprint
        </Text>
        <Text selectable style={[styles.fingerprintValue, { color: md3Theme.colors.onSurface }]}>
          {props.verification.presentedFingerprint}
        </Text>
      </>
    )
  }

  const renderPendingActions = (): JSX.Element | null => {
    if (props.verification?.status !== 'pending') {
      return null
    }

    return (
      <>
        <Button onPress={props.onRejectHostKey}>Reject</Button>
        <Button onPress={props.onAcceptHostKey}>Accept</Button>
      </>
    )
  }

  const renderMismatchActions = (): JSX.Element | null => {
    if (props.verification?.status !== 'mismatch') {
      return null
    }

    return (
      <>
        <Button onPress={props.onCloseMismatch}>Close</Button>
        <Button onPress={props.onRemoveStoredHostKey} textColor={md3Theme.colors.error}>
          Remove stored key
        </Button>
      </>
    )
  }

  return (
    <Modal animationType="fade" onRequestClose={handleRequestClose} transparent visible={isVisible}>
      <Pressable onPress={handleRequestClose} style={[styles.overlay, { backgroundColor: SCRIM_COLOR }]}>
        <Pressable onPress={absorbCardPress} style={styles.cardWrap}>
          <View
            style={[
              styles.card,
              { backgroundColor: md3Theme.colors.surface, borderColor: md3Theme.colors.outlineVariant },
            ]}
          >
            <Text style={[styles.title, { color: md3Theme.colors.onSurface }]}>{resolveTitle()}</Text>
            <ScrollView contentContainerStyle={styles.bodyContent} style={styles.body}>
              <Text style={[styles.hostLabel, { color: md3Theme.colors.onSurfaceVariant }]}>{props.hostLabel}</Text>
              {renderPendingBody()}
              {renderMismatchBody()}
            </ScrollView>
            <View style={styles.actions}>
              {renderPendingActions()}
              {renderMismatchActions()}
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
  body: {
    maxHeight: 360,
  },
  bodyContent: {
    paddingBottom: 8,
    paddingHorizontal: 20,
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
  fingerprintLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 16,
  },
  fingerprintValue: {
    fontFamily: 'jetBrainsMonoRegular',
    fontSize: 13,
    marginTop: 4,
  },
  hostLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  overlay: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    paddingBottom: 8,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  warning: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginTop: 12,
  },
})
