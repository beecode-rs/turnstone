import { type JSX, useState } from 'react'
import { Button, Menu } from 'react-native-paper'

import { TreeDensityPreferenceMapper } from '#src/business/enum/tree-density-preference-mapper-enum'
import { useTreeDensity } from '#src/ui-component/tree/tree-density-context'

const DENSITY_OPTIONS: { label: string; value: TreeDensityPreferenceMapper }[] = [
  { label: 'Compact', value: TreeDensityPreferenceMapper.COMPACT },
  { label: 'Default', value: TreeDensityPreferenceMapper.DEFAULT },
  { label: 'Wide', value: TreeDensityPreferenceMapper.WIDE },
]

export const TreeDensityMenu = (): JSX.Element => {
  const { density, saveDensity } = useTreeDensity()
  const [isVisible, setIsVisible] = useState(false)

  const resolveLeadingIcon = (params: { isMatch: boolean }): string | undefined => {
    if (params.isMatch) {
      return 'check'
    }

    return undefined
  }

  const resolveSelectedLabel = (): string => {
    const selectedOption = DENSITY_OPTIONS.find((option) => {
      return option.value === density
    })

    return selectedOption?.label ?? DENSITY_OPTIONS[1].label
  }

  const selectDensity = (density: TreeDensityPreferenceMapper): void => {
    setIsVisible(false)
    void saveDensity(density)
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
      {DENSITY_OPTIONS.map((option) => {
        return (
          <Menu.Item
            key={option.value}
            leadingIcon={resolveLeadingIcon({ isMatch: density === option.value })}
            onPress={() => {
              selectDensity(option.value)
            }}
            title={option.label}
          />
        )
      })}
    </Menu>
  )
}
