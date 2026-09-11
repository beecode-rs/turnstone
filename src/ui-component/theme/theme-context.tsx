import { type DefaultTheme } from 'expo-router'
import { type JSX, type ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react'
import { type ColorSchemeName, useColorScheme } from 'react-native'
import { type MD3Theme } from 'react-native-paper'

import { type EffectiveThemeSchemeMapper } from '#src/business/enum/effective-theme-scheme-mapper-enum'
import { ThemeSchemePreferenceMapper } from '#src/business/enum/theme-scheme-preference-mapper-enum'
import { ThemeStyleMapper } from '#src/business/enum/theme-style-mapper-enum'
import { ThemeSystemSchemeMapper } from '#src/business/enum/theme-system-scheme-mapper-enum'
import { type ThemePreference } from '#src/business/model/theme-preference'
import { ThemePreferenceService } from '#src/business/service/theme-preference-service'
import { themePreferenceStorage } from '#src/lib/async-storage'
import { type TreeStatusColors, effectiveThemeUtil } from '#src/ui-component/theme/effective-theme'

interface ThemePreferenceContextValue {
  diffColors: { add: string; remove: string }
  effectiveScheme: EffectiveThemeSchemeMapper
  md3Theme: MD3Theme
  navigationTheme: typeof DefaultTheme
  preference: ThemePreference
  savePreference: (preference: ThemePreference) => Promise<void>
  treeStatusColors: TreeStatusColors
}

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | undefined>(undefined)

const resolveThemeSystemScheme = (params: { colorScheme: ColorSchemeName | null }): ThemeSystemSchemeMapper | null => {
  if (params.colorScheme === 'dark') {
    return ThemeSystemSchemeMapper.DARK
  }
  if (params.colorScheme === 'light') {
    return ThemeSystemSchemeMapper.LIGHT
  }

  return null
}

export const ThemePreferenceProvider = (props: { children: ReactNode }): JSX.Element => {
  const systemScheme = resolveThemeSystemScheme({ colorScheme: useColorScheme() })
  const [preference, setPreference] = useState<ThemePreference>({
    scheme: ThemeSchemePreferenceMapper.SYSTEM,
    style: ThemeStyleMapper.PAPER,
  })
  const themePreferenceService = useMemo(() => {
    return new ThemePreferenceService()
  }, [])

  useEffect(() => {
    void themePreferenceService.loadPreference({ storage: themePreferenceStorage }).then((loadedPreference) => {
      setPreference(loadedPreference)
    })
  }, [themePreferenceService])

  const effectiveScheme = themePreferenceService.resolveScheme({ scheme: preference.scheme, systemScheme })
  const effectiveTheme = themePreferenceService.resolveTheme({ preference, systemScheme })
  const md3Theme = useMemo(() => {
    return effectiveThemeUtil.resolveMd3Theme({ theme: effectiveTheme })
  }, [effectiveTheme])
  const navigationTheme = useMemo(() => {
    return effectiveThemeUtil.resolveNavigationTheme({ md3Theme, scheme: effectiveScheme })
  }, [md3Theme, effectiveScheme])
  const diffColors = useMemo(() => {
    return effectiveThemeUtil.resolveDiffColors({ theme: effectiveTheme })
  }, [effectiveTheme])
  const treeStatusColors = useMemo(() => {
    return effectiveThemeUtil.resolveTreeStatusColors({ theme: effectiveTheme })
  }, [effectiveTheme])
  const contextValue = useMemo(() => {
    return {
      diffColors,
      effectiveScheme,
      md3Theme,
      navigationTheme,
      preference,
      savePreference: (nextPreference: ThemePreference) => {
        return themePreferenceService
          .savePreference({ preference: nextPreference, storage: themePreferenceStorage })
          .then(() => {
            setPreference(nextPreference)
          })
      },
      treeStatusColors,
    }
  }, [diffColors, effectiveScheme, md3Theme, navigationTheme, preference, themePreferenceService, treeStatusColors])

  return <ThemePreferenceContext.Provider value={contextValue}>{props.children}</ThemePreferenceContext.Provider>
}

export const useThemePreference = (): ThemePreferenceContextValue => {
  const contextValue = useContext(ThemePreferenceContext)

  if (!contextValue) {
    throw new Error('useThemePreference requires ThemePreferenceProvider')
  }

  return contextValue
}
