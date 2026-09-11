import { type JSX, useState } from 'react'
import { Button, Menu } from 'react-native-paper'

import { ViewMarginPreferenceMapper } from '#src/business/enum/view-margin-preference-mapper-enum'
import { useViewMargin } from '#src/ui-component/code-viewer/view-margin-context'

const MARGIN_OPTIONS: { label: string; value: ViewMarginPreferenceMapper }[] = [
  { label: 'Compact', value: ViewMarginPreferenceMapper.COMPACT },
  { label: 'Normal', value: ViewMarginPreferenceMapper.NORMAL },
  { label: 'Large', value: ViewMarginPreferenceMapper.LARGE },
]

export const ViewMarginMenu = (): JSX.Element => {
  const { margin, saveMargin } = useViewMargin()
  const [isVisible, setIsVisible] = useState(false)

  const resolveLeadingIcon = (params: { isMatch: boolean }): string | undefined => {
    if (params.isMatch) {
      return 'check'
    }

    return undefined
  }

  const resolveSelectedLabel = (): string => {
    const selectedOption = MARGIN_OPTIONS.find((option) => {
      return option.value === margin
    })

    return selectedOption?.label ?? MARGIN_OPTIONS[1].label
  }

  const selectMargin = (margin: ViewMarginPreferenceMapper): void => {
    setIsVisible(false)
    void saveMargin(margin)
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
      {MARGIN_OPTIONS.map((option) => {
        return (
          <Menu.Item
            key={option.value}
            leadingIcon={resolveLeadingIcon({ isMatch: margin === option.value })}
            onPress={() => {
              selectMargin(option.value)
            }}
            title={option.label}
          />
        )
      })}
    </Menu>
  )
}
