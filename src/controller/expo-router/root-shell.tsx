import { Stack, ThemeProvider } from 'expo-router'
import * as SystemUI from 'expo-system-ui'
import { type JSX, useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { PaperProvider } from 'react-native-paper'

import { deviceKeyUseCase } from '#src/business/use-case/device-key-use-case'
import { AnimatedSplashOverlay } from '#src/ui-component/animated-icon'
import { FontSizeProvider } from '#src/ui-component/code-viewer/font-size-context'
import { LineNumbersProvider } from '#src/ui-component/code-viewer/line-numbers-context'
import { ViewMarginProvider } from '#src/ui-component/code-viewer/view-margin-context'
import { WordWrapProvider } from '#src/ui-component/code-viewer/word-wrap-context'
import { DisplayCutoutProvider } from '#src/ui-component/display-cutout-context'
import { FabOpacityProvider } from '#src/ui-component/fab-opacity-context'
import { FooterProvider } from '#src/ui-component/footer-context'
import { FullscreenProvider } from '#src/ui-component/fullscreen-context'
import { AlwaysOpenDrawerProvider } from '#src/ui-component/open-screens/always-open-drawer-context'
import { OpenScreensProvider } from '#src/ui-component/open-screens/open-screens-context'
import { PlantumlServerProvider } from '#src/ui-component/plantuml/plantuml-server-context'
import { SearchIgnoredFilesProvider } from '#src/ui-component/search/search-ignored-files-context'
import { ThemePreferenceProvider, useThemePreference } from '#src/ui-component/theme/theme-context'
import { DotFilesProvider } from '#src/ui-component/tree/dot-files-context'
import { FileNestingProvider } from '#src/ui-component/tree/file-nesting-context'
import { IgnoredFilesProvider } from '#src/ui-component/tree/ignored-files-context'
import { TreeDensityProvider } from '#src/ui-component/tree/tree-density-context'

const ThemedAppRoot = (): JSX.Element => {
  const { md3Theme, navigationTheme } = useThemePreference()

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(md3Theme.colors.background)
  }, [md3Theme])

  useEffect(() => {
    void deviceKeyUseCase.find().catch((error: unknown) => {
      // eslint-disable-next-line no-console -- boot warm-read failure is non-fatal and only surfaces in Metro logs
      console.warn('[device-key] boot check failed:', error)
    })
  }, [])

  return (
    <PaperProvider theme={md3Theme}>
      <ThemeProvider value={navigationTheme}>
        <AnimatedSplashOverlay />
        <KeyboardProvider>
          <View style={styles.root}>
            <Stack screenOptions={{ headerShown: false }} />
          </View>
        </KeyboardProvider>
      </ThemeProvider>
    </PaperProvider>
  )
}

export const RootShell = (): JSX.Element => {
  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemePreferenceProvider>
        <DisplayCutoutProvider>
          <AlwaysOpenDrawerProvider>
            <OpenScreensProvider>
              <TreeDensityProvider>
                <DotFilesProvider>
                  <FileNestingProvider>
                    <IgnoredFilesProvider>
                      <FabOpacityProvider>
                        <LineNumbersProvider>
                          <FontSizeProvider>
                            <ViewMarginProvider>
                              <WordWrapProvider>
                                <SearchIgnoredFilesProvider>
                                  <PlantumlServerProvider>
                                    <FooterProvider>
                                      <FullscreenProvider>
                                        <ThemedAppRoot />
                                      </FullscreenProvider>
                                    </FooterProvider>
                                  </PlantumlServerProvider>
                                </SearchIgnoredFilesProvider>
                              </WordWrapProvider>
                            </ViewMarginProvider>
                          </FontSizeProvider>
                        </LineNumbersProvider>
                      </FabOpacityProvider>
                    </IgnoredFilesProvider>
                  </FileNestingProvider>
                </DotFilesProvider>
              </TreeDensityProvider>
            </OpenScreensProvider>
          </AlwaysOpenDrawerProvider>
        </DisplayCutoutProvider>
      </ThemePreferenceProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
})
