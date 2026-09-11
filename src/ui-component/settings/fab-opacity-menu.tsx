import { type JSX, useState } from 'react'
import { Button, Menu } from 'react-native-paper'

import { type FabOpacityPreference } from '#src/business/model/fab-opacity-preference'
import { useFabOpacity } from '#src/ui-component/fab-opacity-context'

const FAB_OPACITY_OPTIONS: { label: string; value: FabOpacityPreference }[] = [
  { label: '20%', value: 20 },
  { label: '40%', value: 40 },
  { label: '60%', value: 60 },
  { label: '80%', value: 80 },
  { label: '100%', value: 100 },
]

export const FabOpacityMenu = (): JSX.Element => {
  const { opacityPercent, saveOpacityPercent } = useFabOpacity()
  const [isVisible, setIsVisible] = useState(false)

  const resolveLeadingIcon = (params: { isMatch: boolean }): string | undefined => {
    if (params.isMatch) {
      return 'check'
    }

    return undefined
  }

  const resolveSelectedLabel = (): string => {
    return `${String(opacityPercent)}%`
  }

  const selectOpacityPercent = (opacityPercent: FabOpacityPreference): void => {
    setIsVisible(false)
    void saveOpacityPercent(opacityPercent)
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
      {FAB_OPACITY_OPTIONS.map((option) => {
        return (
          <Menu.Item
            key={option.label}
            leadingIcon={resolveLeadingIcon({ isMatch: opacityPercent === option.value })}
            onPress={() => {
              selectOpacityPercent(option.value)
            }}
            title={option.label}
          />
        )
      })}
    </Menu>
  )
}
