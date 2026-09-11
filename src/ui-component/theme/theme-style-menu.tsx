import { type JSX, useState } from 'react'
import { Button, Menu } from 'react-native-paper'

import { ThemeStyleMapper } from '#src/business/enum/theme-style-mapper-enum'
import { useThemePreference } from '#src/ui-component/theme/theme-context'

const STYLE_OPTIONS: { label: string; value: ThemeStyleMapper }[] = [
  { label: 'Paper', value: ThemeStyleMapper.PAPER },
  { label: 'E-ink', value: ThemeStyleMapper.EINK },
]

export const ThemeStyleMenu = (): JSX.Element => {
  const { preference, savePreference } = useThemePreference()
  const [isVisible, setIsVisible] = useState(false)

  const resolveLeadingIcon = (params: { isMatch: boolean }): string | undefined => {
    if (params.isMatch) {
      return 'check'
    }

    return undefined
  }

  const resolveSelectedLabel = (): string => {
    const selectedOption = STYLE_OPTIONS.find((option) => {
      return option.value === preference.style
    })

    return selectedOption?.label ?? STYLE_OPTIONS[0].label
  }

  const selectStyle = (style: ThemeStyleMapper): void => {
    setIsVisible(false)
    void savePreference({ ...preference, style })
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
      {STYLE_OPTIONS.map((option) => {
        return (
          <Menu.Item
            key={option.value}
            leadingIcon={resolveLeadingIcon({ isMatch: preference.style === option.value })}
            onPress={() => {
              selectStyle(option.value)
            }}
            title={option.label}
          />
        )
      })}
    </Menu>
  )
}
