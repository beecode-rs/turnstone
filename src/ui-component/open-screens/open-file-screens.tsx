import { type JSX } from 'react'
import { StyleSheet, View, type ViewStyle } from 'react-native'

import { type GitTreeStatusKindMapper } from '#src/business/enum/git-tree-status-kind-mapper-enum'
import { OpenFileKindMapper } from '#src/business/enum/open-file-kind-mapper-enum'
import { type MarkdownCodeBlock } from '#src/business/model/markdown-code-block'
import { FileScreen } from '#src/ui-component/open-screens/file-screen'
import { HtmlScreen } from '#src/ui-component/open-screens/html-screen'
import { MarkdownScreen } from '#src/ui-component/open-screens/markdown-screen'
import { MermaidScreen } from '#src/ui-component/open-screens/mermaid-screen'
import { useOpenScreens } from '#src/ui-component/open-screens/open-screens-context'
import { PlantumlScreen } from '#src/ui-component/open-screens/plantuml-screen'
import { useThemePreference } from '#src/ui-component/theme/theme-context'
import { openScreensUtil } from '#src/util/open-screens-util'

export type OpenFileScreensProps = {
  gitRepoRoot: string | null
  gitStatusByPath: Record<string, GitTreeStatusKindMapper>
  hostId: string
  isActiveRoute: boolean
  onCodeBlockPress: (block: MarkdownCodeBlock) => void
  onPressAbout: () => void
  onPressSettings: () => void
  onViewDiff: (params: { path: string }) => void
}

const resolveScreenStyle = (params: { isActive: boolean }): ViewStyle => {
  if (params.isActive) {
    return styles.visibleScreen
  }

  return styles.hiddenScreen
}

export const OpenFileScreens = (props: OpenFileScreensProps): JSX.Element => {
  const { navigationTheme } = useThemePreference()
  const { activeFilePath, openFilePaths } = useOpenScreens()

  if (openFilePaths.length === 0) {
    return <></>
  }

  const renderScreen = (path: string): JSX.Element => {
    const kind = openScreensUtil.resolveKind({ path })
    if (kind === OpenFileKindMapper.MARKDOWN) {
      return (
        <MarkdownScreen
          hostId={props.hostId}
          onCodeBlockPress={props.onCodeBlockPress}
          path={path}
          onPressAbout={props.onPressAbout}
          onPressSettings={props.onPressSettings}
        />
      )
    }
    if (kind === OpenFileKindMapper.HTML) {
      return (
        <HtmlScreen
          hostId={props.hostId}
          path={path}
          onPressAbout={props.onPressAbout}
          onPressSettings={props.onPressSettings}
        />
      )
    }
    if (kind === OpenFileKindMapper.MERMAID) {
      return (
        <MermaidScreen
          hostId={props.hostId}
          path={path}
          onPressAbout={props.onPressAbout}
          onPressSettings={props.onPressSettings}
        />
      )
    }
    if (kind === OpenFileKindMapper.PLANTUML) {
      return (
        <PlantumlScreen
          hostId={props.hostId}
          path={path}
          onPressAbout={props.onPressAbout}
          onPressSettings={props.onPressSettings}
        />
      )
    }

    return (
      <FileScreen
        hostId={props.hostId}
        isActive={path === activeFilePath && props.isActiveRoute}
        isDiffAvailable={props.gitRepoRoot !== null && path in props.gitStatusByPath}
        onPressAbout={props.onPressAbout}
        onPressSettings={props.onPressSettings}
        onViewDiff={props.onViewDiff}
        path={path}
      />
    )
  }

  return (
    <View
      style={[
        resolveScreenStyle({ isActive: activeFilePath !== null }),
        { backgroundColor: navigationTheme.colors.background },
      ]}
    >
      {openFilePaths.map((path) => {
        return (
          <View key={path} style={resolveScreenStyle({ isActive: path === activeFilePath })}>
            {renderScreen(path)}
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  hiddenScreen: {
    display: 'none',
  },
  visibleScreen: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
})
