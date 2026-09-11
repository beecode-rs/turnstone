import { type JSX, useState } from 'react'
import { Button, Menu } from 'react-native-paper'

import { ThemeSchemePreferenceMapper } from '#src/business/enum/theme-scheme-preference-mapper-enum'
import { useThemePreference } from '#src/ui-component/theme/theme-context'

const SCHEME_OPTIONS: { label: string; value: ThemeSchemePreferenceMapper }[] = [
  { label: 'Auto', value: ThemeSchemePreferenceMapper.SYSTEM },
  { label: 'Light', value: ThemeSchemePreferenceMapper.LIGHT },
  { label: 'Dark', value: ThemeSchemePreferenceMapper.DARK },
]

export const ThemeSchemeMenu = (): JSX.Element => {
  const { preference, savePreference } = useThemePreference()
  const [isVisible, setIsVisible] = useState(false)

  const resolveLeadingIcon = (params: { isMatch: boolean }): string | undefined => {
    if (params.isMatch) {
      return 'check'
    }

    return undefined
  }

  const resolveSelectedLabel = (): string => {
    const selectedOption = SCHEME_OPTIONS.find((option) => {
      return option.value === preference.scheme
    })

    return selectedOption?.label ?? SCHEME_OPTIONS[0].label
  }

  const selectScheme = (scheme: ThemeSchemePreferenceMapper): void => {
    setIsVisible(false)
    void savePreference({ ...preference, scheme })
  }

  return (
    <Menu
      anchor={
        <Button
          compact
          mode="outlined"
          onPress={() => {
            setIsVisible(true)
          }}
        >
          {resolveSelectedLabel()}
        </Button>
      }
      onDismiss={() => {
        setIsVisible(false)
      }}
      visible={isVisible}
    >
      {SCHEME_OPTIONS.map((option) => {
        return (
          <Menu.Item
            key={option.value}
            leadingIcon={resolveLeadingIcon({ isMatch: preference.scheme === option.value })}
            onPress={() => {
              selectScheme(option.value)
            }}
            title={option.label}
          />
        )
      })}
    </Menu>
  )
}
