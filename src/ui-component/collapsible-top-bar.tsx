import { type JSX } from 'react'
import { StyleSheet } from 'react-native'
import { FAB } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AppTopBar, type AppTopBarProps } from '#src/ui-component/app-top-bar'
import { useFabOpacity } from '#src/ui-component/fab-opacity-context'
import { useFullscreen } from '#src/ui-component/fullscreen-context'
import { useThemePreference } from '#src/ui-component/theme/theme-context'

type CollapsibleTopBarProps = Omit<AppTopBarProps, 'onPressHide'>

export const CollapsibleTopBar = (props: CollapsibleTopBarProps): JSX.Element => {
  const { md3Theme } = useThemePreference()
  const { opacityPercent } = useFabOpacity()
  const { isFullscreen, setIsFullscreen } = useFullscreen()
  const insets = useSafeAreaInsets()

  const handleHideTopBar = (): void => {
    setIsFullscreen(true)
  }

  const handleShowTopBar = (): void => {
    setIsFullscreen(false)
  }

  if (isFullscreen) {
    return (
      <FAB
        accessibilityLabel="Show menu"
        color={md3Theme.colors.onPrimaryContainer}
        icon="arrow-collapse"
        mode="flat"
        onPress={handleShowTopBar}
        size="small"
        style={[
          styles.showFab,
          {
            backgroundColor: md3Theme.colors.primaryContainer,
            opacity: opacityPercent / 100,
            top: insets.top + 8,
          },
        ]}
      />
    )
  }

  return <AppTopBar {...props} onPressHide={handleHideTopBar} />
}

const styles = StyleSheet.create({
  showFab: {
    position: 'absolute',
    right: 16,
    zIndex: 1,
  },
})
