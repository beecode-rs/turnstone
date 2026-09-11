import { MaterialCommunityIcons } from '@expo/vector-icons'
import { type ComponentProps, type JSX, useState } from 'react'
import { Menu } from 'react-native-paper'

import { IconButton } from '#src/ui-component/icon-button'
import { useThemePreference } from '#src/ui-component/theme/theme-context'

export type RowActionsMenuItem = {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name']
  iconColor?: string
  label: string
  onPress: () => void
}

export type RowActionsMenuProps = {
  items: RowActionsMenuItem[]
  tip: string
}

export const RowActionsMenu = (props: RowActionsMenuProps): JSX.Element => {
  const { items, tip } = props
  const { md3Theme } = useThemePreference()
  const [isVisible, setIsVisible] = useState(false)

  const selectItem = (item: RowActionsMenuItem): void => {
    setIsVisible(false)
    item.onPress()
  }

  return (
    <Menu
      anchor={
        <IconButton
          icon="dots-vertical"
          iconColor={md3Theme.colors.onSurfaceVariant}
          onPress={() => {
            setIsVisible(true)
          }}
          tip={tip}
        />
      }
      onDismiss={() => {
        setIsVisible(false)
      }}
      visible={isVisible}
    >
      {items.map((item) => {
        return (
          <Menu.Item
            key={item.label}
            leadingIcon={({ size }) => {
              return (
                <MaterialCommunityIcons
                  color={item.iconColor ?? md3Theme.colors.onSurface}
                  name={item.icon}
                  size={size}
                />
              )
            }}
            onPress={() => {
              selectItem(item)
            }}
            title={item.label}
          />
        )
      })}
    </Menu>
  )
}
