import { type ThemeSchemePreferenceMapper } from '#src/business/enum/theme-scheme-preference-mapper-enum'
import { type ThemeStyleMapper } from '#src/business/enum/theme-style-mapper-enum'
import { type ThemeSystemSchemeMapper } from '#src/business/enum/theme-system-scheme-mapper-enum'

export type ThemePreference = {
  scheme: ThemeSchemePreferenceMapper
  style: ThemeStyleMapper
}

export type ThemePreferenceStorage = {
  readPreference: () => Promise<string | null>
  writePreference: (params: { value: string }) => Promise<void>
}

export type ThemeSystemScheme = ThemeSystemSchemeMapper | null
