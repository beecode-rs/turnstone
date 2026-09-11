import { MaterialCommunityIcons } from '@expo/vector-icons'
import { type JSX, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { type MD3Theme, Menu } from 'react-native-paper'

import { type GitTreeStatusKindMapper } from '#src/business/enum/git-tree-status-kind-mapper-enum'
import { ThemeStyleMapper } from '#src/business/enum/theme-style-mapper-enum'
import { ThemedColorMapper } from '#src/business/enum/themed-color-mapper-enum'
import { type TreeRowItem } from '#src/business/model/tree-browser'
import { effectiveThemeUtil } from '#src/ui-component/theme/effective-theme'
import { useThemePreference } from '#src/ui-component/theme/theme-context'
import { FileIcon } from '#src/ui-component/tree/file-icon'
import { useTreeDensity } from '#src/ui-component/tree/tree-density-context'
import { TREE_DENSITY_METRICS } from '#src/ui-component/tree/tree-density-metrics'
import { fileIconUtil } from '#src/util/file-icon-util'

const DOUBLE_PRESS_MS = 300

const resolveIconMonoColor = (params: { md3Theme: MD3Theme; style: ThemeStyleMapper }): string | undefined => {
  if (params.style !== ThemeStyleMapper.EINK) {
    return undefined
  }

  return params.md3Theme.colors.onSurface
}

interface TreeRowProps {
  gitStatus?: GitTreeStatusKindMapper
  isDiffAvailable: boolean
  isSelected: boolean
  onOpen: () => void
  onPress: () => void
  onViewDiff: () => void
  row: TreeRowItem
}

export const TreeRow = (props: TreeRowProps): JSX.Element => {
  const { md3Theme, preference, treeStatusColors } = useThemePreference()
  const { density } = useTreeDensity()
  const metrics = TREE_DENSITY_METRICS[density]
  const lastPressAtRef = useRef(0)
  const [isMenuVisible, setIsMenuVisible] = useState(false)
  const isFile = !props.row.entry.isDir

  const handlePress = (): void => {
    if (!isFile) {
      props.onPress()

      return
    }
    const pressedAt = Date.now()
    if (pressedAt - lastPressAtRef.current < DOUBLE_PRESS_MS) {
      lastPressAtRef.current = 0
      props.onOpen()

      return
    }
    lastPressAtRef.current = pressedAt
    props.onPress()
  }

  const handleLongPress = (): void => {
    if (!isFile) {
      return
    }
    setIsMenuVisible(true)
  }

  const handleOpenItemPress = (): void => {
    setIsMenuVisible(false)
    props.onOpen()
  }

  const handleViewDiffItemPress = (): void => {
    setIsMenuVisible(false)
    props.onViewDiff()
  }

  const renderChevron = (): JSX.Element => {
    if (!props.row.entry.isDir && !props.row.hasNestedChildren) {
      return <View style={{ width: metrics.chevronSize }} />
    }

    return (
      <MaterialCommunityIcons
        color={md3Theme.colors.onSurfaceVariant}
        name="chevron-right"
        size={metrics.chevronSize}
        style={props.row.isExpanded && styles.chevronOpen}
      />
    )
  }

  const renderEntryIcon = (): JSX.Element => {
    return (
      <FileIcon
        iconKey={fileIconUtil.resolveFileIcon({
          isDir: props.row.entry.isDir,
          isExpanded: props.row.isExpanded,
          name: props.row.entry.name,
        })}
        monoColor={resolveIconMonoColor({ md3Theme, style: preference.style })}
        size={metrics.entryIconSize}
        style={styles.entryIcon}
      />
    )
  }

  const resolveNameStyle = (): { color: string; fontWeight: '400' | '700' } => {
    if (props.gitStatus === undefined) {
      return { color: md3Theme.colors.onSurface, fontWeight: '400' }
    }

    return treeStatusColors[props.gitStatus]
  }

  return (
    <Menu
      anchor={
        <Pressable
          accessibilityState={{ selected: props.isSelected }}
          onLongPress={handleLongPress}
          onPress={handlePress}
          style={[
            styles.row,
            props.isSelected && {
              backgroundColor: effectiveThemeUtil.resolveThemedColor({
                color: ThemedColorMapper.BACKGROUND_SELECTED,
                md3Theme,
              }),
            },
            {
              height: metrics.rowHeight,
              paddingLeft: metrics.horizontalPadding + props.row.depth * metrics.indentPerDepth,
              paddingRight: metrics.horizontalPadding,
            },
          ]}
        >
          {renderChevron()}
          {renderEntryIcon()}
          <Text numberOfLines={1} style={[styles.name, resolveNameStyle(), { fontSize: metrics.fontSize }]}>
            {props.row.entry.name}
          </Text>
        </Pressable>
      }
      onDismiss={() => {
        setIsMenuVisible(false)
      }}
      visible={isMenuVisible}
    >
      <Menu.Item leadingIcon="open-in-new" onPress={handleOpenItemPress} title="Open" />
      <Menu.Item
        disabled={!props.isDiffAvailable}
        leadingIcon="file-compare"
        onPress={handleViewDiffItemPress}
        title="View diff"
      />
    </Menu>
  )
}

const styles = StyleSheet.create({
  chevronOpen: {
    transform: [{ rotate: '90deg' }],
  },
  entryIcon: {
    marginLeft: 2,
    marginRight: 6,
  },
  name: {
    flex: 1,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
})
