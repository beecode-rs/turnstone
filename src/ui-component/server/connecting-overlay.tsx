import { type JSX } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'

import { type HostConfig } from '#src/business/model/host-config'
import { type ProjectConfig } from '#src/business/model/project-config'
import { useThemePreference } from '#src/ui-component/theme/theme-context'

const SCRIM_COLOR = 'rgba(0, 0, 0, 0.5)'

interface ConnectingOverlayProps {
  project: ProjectConfig | undefined
  server: HostConfig | undefined
}

export const ConnectingOverlay = (props: ConnectingOverlayProps): JSX.Element | null => {
  const { md3Theme } = useThemePreference()
  const { project, server } = props

  if (!project || !server) {
    return null
  }

  return (
    <View pointerEvents="box-only" style={[styles.overlay, { backgroundColor: SCRIM_COLOR }]}>
      <View
        style={[styles.card, { backgroundColor: md3Theme.colors.surface, borderColor: md3Theme.colors.outlineVariant }]}
      >
        <ActivityIndicator color={md3Theme.colors.primary} size="large" />
        <Text style={[styles.title, { color: md3Theme.colors.onSurface }]} variant="titleMedium">
          {`Connecting to ${project.name}…`}
        </Text>
        <Text numberOfLines={1} style={[styles.hostDetail, { color: md3Theme.colors.onSurfaceVariant }]}>
          {`${server.label} · ${server.username}@${server.host}:${String(server.port)}`}
        </Text>
        <Text numberOfLines={1} style={[styles.hostDetail, { color: md3Theme.colors.onSurfaceVariant }]}>
          {project.path}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
    maxWidth: 480,
    paddingHorizontal: 24,
    paddingVertical: 28,
    width: '100%',
  },
  hostDetail: {
    fontFamily: 'jetBrainsMonoRegular',
    fontSize: 13,
  },
  overlay: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    padding: 24,
    right: 0,
    top: 0,
    zIndex: 2,
  },
  title: {
    fontWeight: '600',
    textAlign: 'center',
  },
})
