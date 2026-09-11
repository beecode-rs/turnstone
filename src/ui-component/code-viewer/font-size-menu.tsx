import { type JSX, useState } from 'react'
import { Button, Menu } from 'react-native-paper'

import { FontSizePreferenceMapper } from '#src/business/enum/font-size-preference-mapper-enum'
import { useFontSize } from '#src/ui-component/code-viewer/font-size-context'

const FONT_SIZE_OPTIONS: { label: string; value: FontSizePreferenceMapper }[] = [
  { label: 'XS', value: FontSizePreferenceMapper.XS },
  { label: 'S', value: FontSizePreferenceMapper.S },
  { label: 'M', value: FontSizePreferenceMapper.M },
  { label: 'L', value: FontSizePreferenceMapper.L },
  { label: 'XL', value: FontSizePreferenceMapper.XL },
  { label: 'XXL', value: FontSizePreferenceMapper.XXL },
]

export const FontSizeMenu = (): JSX.Element => {
  const { fontSize, saveFontSize } = useFontSize()
  const [isVisible, setIsVisible] = useState(false)

  const resolveLeadingIcon = (params: { isMatch: boolean }): string | undefined => {
    if (params.isMatch) {
      return 'check'
    }

    return undefined
  }

  const resolveSelectedLabel = (): string => {
    const selectedOption = FONT_SIZE_OPTIONS.find((option) => {
      return option.value === fontSize
    })

    return selectedOption?.label ?? FONT_SIZE_OPTIONS[2].label
  }

  const selectFontSize = (nextFontSize: FontSizePreferenceMapper): void => {
    setIsVisible(false)
    void saveFontSize(nextFontSize)
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
      {FONT_SIZE_OPTIONS.map((option) => {
        return (
          <Menu.Item
            key={option.value}
            leadingIcon={resolveLeadingIcon({ isMatch: fontSize === option.value })}
            onPress={() => {
              selectFontSize(option.value)
            }}
            title={option.label}
          />
        )
      })}
    </Menu>
  )
}
