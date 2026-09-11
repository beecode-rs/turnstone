import { type JSX, useState } from 'react'
import { StyleSheet } from 'react-native'
import { Button, Menu } from 'react-native-paper'

import { useThemePreference } from '#src/ui-component/theme/theme-context'

export type TopBarSelectOption = {
  label: string
  value: string
}

interface TopBarSelectProps {
  onChange: (value: string) => void
  options: TopBarSelectOption[]
  value: string
}

export const TopBarSelect = (props: TopBarSelectProps): JSX.Element => {
  const { md3Theme } = useThemePreference()
  const [isMenuVisible, setIsMenuVisible] = useState(false)

  const selectedOption = props.options.find((option) => {
    return option.value === props.value
  })

  const closeMenu = (): void => {
    setIsMenuVisible(false)
  }

  const resolveLeadingIcon = (option: TopBarSelectOption): string | undefined => {
    if (option.value === props.value) {
      return 'check'
    }

    return undefined
  }

  const renderOption = (option: TopBarSelectOption): JSX.Element => {
    return (
      <Menu.Item
        key={option.value}
        leadingIcon={resolveLeadingIcon(option)}
        onPress={() => {
          closeMenu()
          props.onChange(option.value)
        }}
        title={option.label}
      />
    )
  }

  return (
    <Menu
      anchor={
        <Button
          contentStyle={styles.anchorContent}
          icon="menu-down"
          onPress={() => {
            setIsMenuVisible(true)
          }}
          textColor={md3Theme.colors.onSurface}
        >
          {selectedOption?.label ?? props.value}
        </Button>
      }
      onDismiss={closeMenu}
      visible={isMenuVisible}
    >
      {props.options.map(renderOption)}
    </Menu>
  )
}

const styles = StyleSheet.create({
  anchorContent: {
    flexDirection: 'row-reverse',
  },
})
