import { type JSX, type ReactNode, useState } from 'react'
import { StyleSheet } from 'react-native'
import { Appbar, Menu } from 'react-native-paper'

import { IconButton } from '#src/ui-component/icon-button'
import { useThemePreference } from '#src/ui-component/theme/theme-context'
import { TopBarSelect, type TopBarSelectOption } from '#src/ui-component/top-bar-select'

export type AppTopBarAction = {
  icon: string
  key: string
  onPress: () => void
  tip: string
}

export type AppTopBarMenuAction = {
  icon: string
  key: string
  onPress: () => void
  title: string
}

export type AppTopBarSelect = {
  key: string
  onChange: (value: string) => void
  options: TopBarSelectOption[]
  value: string
}

export type AppTopBarProps = {
  actions?: AppTopBarAction[]
  menuActions?: AppTopBarMenuAction[]
  onPressAbout?: () => void
  onPressBack?: () => void
  onPressHide?: () => void
  onPressMenu?: () => void
  onPressSettings?: () => void
  selects?: AppTopBarSelect[]
  title: ReactNode
}

export const AppTopBar = (props: AppTopBarProps): JSX.Element => {
  const { md3Theme } = useThemePreference()
  const [isMenuVisible, setIsMenuVisible] = useState(false)

  const openMenu = (): void => {
    setIsMenuVisible(true)
  }

  const closeMenu = (): void => {
    setIsMenuVisible(false)
  }

  const handleAboutPress = (): void => {
    closeMenu()
    if (props.onPressAbout !== undefined) {
      props.onPressAbout()
    }
  }

  const handleSettingsPress = (): void => {
    closeMenu()
    if (props.onPressSettings !== undefined) {
      props.onPressSettings()
    }
  }

  const handleMenuActionPress = (action: AppTopBarMenuAction): void => {
    closeMenu()
    action.onPress()
  }

  const renderAction = (action: AppTopBarAction): JSX.Element => {
    return (
      <IconButton
        icon={action.icon}
        iconColor={md3Theme.colors.onSurface}
        key={action.key}
        onPress={action.onPress}
        tip={action.tip}
      />
    )
  }

  const renderMenuAction = (action: AppTopBarMenuAction): JSX.Element => {
    return (
      <Menu.Item
        key={action.key}
        leadingIcon={action.icon}
        onPress={() => {
          handleMenuActionPress(action)
        }}
        title={action.title}
      />
    )
  }

  const menuActions = props.menuActions ?? []
  const hasMenuItems = menuActions.length > 0 || props.onPressAbout !== undefined || props.onPressSettings !== undefined

  return (
    <Appbar.Header
      mode="small"
      style={[
        styles.header,
        { backgroundColor: md3Theme.colors.surface, borderBottomColor: md3Theme.colors.outlineVariant },
      ]}
    >
      {props.onPressMenu !== undefined && (
        <IconButton icon="menu" iconColor={md3Theme.colors.onSurface} onPress={props.onPressMenu} tip="Open menu" />
      )}
      {props.onPressMenu === undefined && props.onPressBack !== undefined && (
        <Appbar.BackAction color={md3Theme.colors.onSurface} onPress={props.onPressBack} />
      )}
      <Appbar.Content color={md3Theme.colors.onSurface} title={props.title} />
      {(props.selects ?? []).map((select) => {
        return (
          <TopBarSelect key={select.key} onChange={select.onChange} options={select.options} value={select.value} />
        )
      })}
      {(props.actions ?? []).map(renderAction)}
      {hasMenuItems && (
        <Menu
          anchor={
            <IconButton
              icon="dots-vertical"
              iconColor={md3Theme.colors.onSurface}
              onPress={openMenu}
              tip="More options"
            />
          }
          onDismiss={closeMenu}
          visible={isMenuVisible}
        >
          {menuActions.map(renderMenuAction)}
          {props.onPressSettings !== undefined && (
            <Menu.Item leadingIcon="cog" onPress={handleSettingsPress} title="Settings" />
          )}
          {props.onPressAbout !== undefined && (
            <Menu.Item leadingIcon="information-outline" onPress={handleAboutPress} title="About" />
          )}
        </Menu>
      )}
      {props.onPressHide !== undefined && (
        <IconButton
          icon="arrow-expand"
          iconColor={md3Theme.colors.onSurface}
          onPress={props.onPressHide}
          tip="Hide menu"
        />
      )}
    </Appbar.Header>
  )
}

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
})
