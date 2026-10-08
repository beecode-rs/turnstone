import { type JSX, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'

import { SettingsTabKeyMapper } from '#src/business/enum/settings-tab-key-mapper-enum'
import { KeyboardAvoidingArea } from '#src/ui-component/keyboard-avoiding-area'
import { ScrollableTabBar, type ScrollableTabBarTab } from '#src/ui-component/scrollable-tab-bar'
import { FileNestingSettingsTab } from '#src/ui-component/settings/file-nesting-settings-tab'
import { FileViewSettingsTab } from '#src/ui-component/settings/file-view-settings-tab'
import { SearchSettingsTab } from '#src/ui-component/settings/search-settings-tab'
import { SecuritySettingsTab } from '#src/ui-component/settings/security-settings-tab'
import { SshKeySettingsTab } from '#src/ui-component/settings/ssh-key-settings-tab'
import { SystemSettingsTab } from '#src/ui-component/settings/system-settings-tab'
import { TreeViewSettingsTab } from '#src/ui-component/settings/tree-view-settings-tab'
import { useThemePreference } from '#src/ui-component/theme/theme-context'

const SETTINGS_TABS: readonly ScrollableTabBarTab<SettingsTabKeyMapper>[] = [
  { key: SettingsTabKeyMapper.SYSTEM, label: 'System' },
  { key: SettingsTabKeyMapper.SECURITY, label: 'Security' },
  { key: SettingsTabKeyMapper.SSH_KEY, label: 'SSH Key' },
  { key: SettingsTabKeyMapper.FILE_VIEW, label: 'File View' },
  { key: SettingsTabKeyMapper.TREE_VIEW, label: 'Tree View' },
  { key: SettingsTabKeyMapper.FILE_NESTING, label: 'File Nesting' },
  { key: SettingsTabKeyMapper.SEARCH, label: 'Search' },
]

const renderActiveTab = (tabKey: SettingsTabKeyMapper): JSX.Element => {
  switch (tabKey) {
    case SettingsTabKeyMapper.FILE_NESTING: {
      return <FileNestingSettingsTab />
    }
    case SettingsTabKeyMapper.FILE_VIEW: {
      return <FileViewSettingsTab />
    }
    case SettingsTabKeyMapper.SEARCH: {
      return <SearchSettingsTab />
    }
    case SettingsTabKeyMapper.SECURITY: {
      return <SecuritySettingsTab />
    }
    case SettingsTabKeyMapper.SSH_KEY: {
      return <SshKeySettingsTab />
    }
    case SettingsTabKeyMapper.SYSTEM: {
      return <SystemSettingsTab />
    }
    case SettingsTabKeyMapper.TREE_VIEW: {
      return <TreeViewSettingsTab />
    }
    default: {
      throw new Error(`Unsupported settings tab: ${String(tabKey)}`)
    }
  }
}

export const SettingsScreen = (): JSX.Element => {
  const { md3Theme } = useThemePreference()
  const [activeTab, setActiveTab] = useState<SettingsTabKeyMapper>(SettingsTabKeyMapper.SYSTEM)

  const handleSelectTab = (tabKey: SettingsTabKeyMapper): void => {
    setActiveTab(tabKey)
  }

  return (
    <View style={[styles.screen, { backgroundColor: md3Theme.colors.background }]}>
      <ScrollableTabBar activeKey={activeTab} onSelect={handleSelectTab} tabs={SETTINGS_TABS} />
      <KeyboardAvoidingArea style={styles.contentScroll}>
        <ScrollView contentContainerStyle={styles.content} key={activeTab} style={styles.contentScroll}>
          {renderActiveTab(activeTab)}
        </ScrollView>
      </KeyboardAvoidingArea>
    </View>
  )
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 24,
  },
  contentScroll: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
})
