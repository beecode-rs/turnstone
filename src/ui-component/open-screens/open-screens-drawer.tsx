import { type JSX } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Icon } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'

import { OpenFileKindMapper } from '#src/business/enum/open-file-kind-mapper-enum'
import { IconButton } from '#src/ui-component/icon-button'
import { useOpenScreens } from '#src/ui-component/open-screens/open-screens-context'
import { useThemePreference } from '#src/ui-component/theme/theme-context'
import { openScreensUtil } from '#src/util/open-screens-util'
import { remotePathUtil } from '#src/util/remote-path-util'

const DRAWER_SCRIM_COLOR = 'rgba(0, 0, 0, 0.5)'
const ROW_ICON_SIZE_PX = 22
const CLOSE_ICON_SIZE_PX = 18

export type OpenScreensDrawerProps = {
  isPersistent?: boolean
  onCloseFile: (params: { path: string }) => void
  onPressFile: (params: { path: string }) => void
  onPressProjects: () => void
  onPressTree: () => void
  treeLabel: string
}

const resolveFileIconSource = (params: { path: string }): string => {
  const kind = openScreensUtil.resolveKind({ path: params.path })
  if (kind === OpenFileKindMapper.HTML) {
    return 'language-html5'
  }
  if (kind === OpenFileKindMapper.MARKDOWN) {
    return 'language-markdown'
  }
  if (kind === OpenFileKindMapper.MERMAID) {
    return 'chart-tree'
  }
  if (kind === OpenFileKindMapper.PLANTUML) {
    return 'sitemap'
  }

  return 'file-document-outline'
}

export const OpenScreensDrawer = (props: OpenScreensDrawerProps): JSX.Element => {
  const { md3Theme } = useThemePreference()
  const { activeFilePath, closeDrawer, isDrawerOpen, openFilePaths } = useOpenScreens()

  const resolveRowBackgroundColor = (params: { isActive: boolean }): string => {
    if (params.isActive) {
      return md3Theme.colors.primaryContainer
    }

    return 'transparent'
  }

  const resolveRowIconColor = (params: { isActive: boolean }): string => {
    if (params.isActive) {
      return md3Theme.colors.onPrimaryContainer
    }

    return md3Theme.colors.onSurfaceVariant
  }

  const resolveRowLabelColor = (params: { isActive: boolean }): string => {
    if (params.isActive) {
      return md3Theme.colors.onPrimaryContainer
    }

    return md3Theme.colors.onSurface
  }

  const renderTreeRow = (): JSX.Element => {
    const isActive = activeFilePath === null

    return (
      <Pressable
        onPress={props.onPressTree}
        style={[styles.row, { backgroundColor: resolveRowBackgroundColor({ isActive }) }]}
      >
        <Icon color={resolveRowIconColor({ isActive })} size={ROW_ICON_SIZE_PX} source="file-tree" />
        <Text numberOfLines={1} style={[styles.rowLabel, { color: resolveRowLabelColor({ isActive }) }]}>
          {props.treeLabel}
        </Text>
      </Pressable>
    )
  }

  const renderTreeRowSection = (): JSX.Element | null => {
    if (props.isPersistent) {
      return null
    }

    return renderTreeRow()
  }

  const renderFileRow = (path: string): JSX.Element => {
    const isActive = path === activeFilePath
    const fileName = remotePathUtil.toParts({ path }).at(-1) ?? path

    return (
      <View key={path} style={styles.fileRowWrap}>
        <Pressable
          onPress={() => {
            props.onPressFile({ path })
          }}
          style={[styles.fileRow, styles.row, { backgroundColor: resolveRowBackgroundColor({ isActive }) }]}
        >
          <Icon
            color={resolveRowIconColor({ isActive })}
            size={ROW_ICON_SIZE_PX}
            source={resolveFileIconSource({ path })}
          />
          <Text numberOfLines={1} style={[styles.rowLabel, { color: resolveRowLabelColor({ isActive }) }]}>
            {fileName}
          </Text>
        </Pressable>
        <IconButton
          icon="close"
          iconColor={md3Theme.colors.onSurfaceVariant}
          onPress={() => {
            props.onCloseFile({ path })
          }}
          size={CLOSE_ICON_SIZE_PX}
          tip="Close file"
        />
      </View>
    )
  }

  const renderProjectsRow = (): JSX.Element => {
    const isActive = false

    return (
      <Pressable
        onPress={props.onPressProjects}
        style={[styles.row, { backgroundColor: resolveRowBackgroundColor({ isActive }) }]}
      >
        <Icon color={resolveRowIconColor({ isActive })} size={ROW_ICON_SIZE_PX} source="arrow-left" />
        <Icon color={resolveRowIconColor({ isActive })} size={ROW_ICON_SIZE_PX} source="folder" />
        <Text numberOfLines={1} style={[styles.rowLabel, { color: resolveRowLabelColor({ isActive }) }]}>
          Projects
        </Text>
      </Pressable>
    )
  }

  const renderPanelContent = (): JSX.Element => {
    return (
      <SafeAreaView edges={['bottom', 'left', 'top']} style={styles.panelContent}>
        <ScrollView style={styles.list}>
          <Text style={[styles.header, { color: md3Theme.colors.onSurfaceVariant }]}>Open screens</Text>
          {renderTreeRowSection()}
          {openFilePaths.map(renderFileRow)}
        </ScrollView>
        <View style={[styles.divider, { borderTopColor: md3Theme.colors.outlineVariant }]} />
        <View style={styles.projectsFooter}>{renderProjectsRow()}</View>
      </SafeAreaView>
    )
  }

  if (props.isPersistent) {
    return (
      <View
        style={[
          styles.persistentPanel,
          { backgroundColor: md3Theme.colors.surface, borderRightColor: md3Theme.colors.outlineVariant },
        ]}
      >
        {renderPanelContent()}
      </View>
    )
  }

  return (
    <Modal animationType="fade" onRequestClose={closeDrawer} transparent visible={isDrawerOpen}>
      <View style={styles.scrim}>
        <Pressable onPress={closeDrawer} style={StyleSheet.absoluteFill} />
        <View
          style={[
            styles.panel,
            { backgroundColor: md3Theme.colors.surface, borderRightColor: md3Theme.colors.outlineVariant },
          ]}
        >
          {renderPanelContent()}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginVertical: 8,
  },
  fileRow: {
    flex: 1,
  },
  fileRowWrap: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  header: {
    fontSize: 12,
    letterSpacing: 1,
    paddingBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    textTransform: 'uppercase',
  },
  list: {
    flex: 1,
  },
  panel: {
    borderRightWidth: StyleSheet.hairlineWidth,
    maxWidth: 340,
    width: '84%',
  },
  panelContent: {
    flex: 1,
  },
  persistentPanel: {
    borderRightWidth: StyleSheet.hairlineWidth,
    width: 280,
  },
  projectsFooter: {
    paddingBottom: 8,
  },
  row: {
    alignItems: 'center',
    borderRadius: 28,
    flexDirection: 'row',
    gap: 12,
    height: 48,
    paddingHorizontal: 16,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
  },
  scrim: {
    backgroundColor: DRAWER_SCRIM_COLOR,
    flex: 1,
    flexDirection: 'row',
  },
})
