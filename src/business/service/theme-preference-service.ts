import { EffectiveThemeMapper } from '#src/business/enum/effective-theme-mapper-enum'
import { EffectiveThemeSchemeMapper } from '#src/business/enum/effective-theme-scheme-mapper-enum'
import { ThemeSchemePreferenceMapper } from '#src/business/enum/theme-scheme-preference-mapper-enum'
import { ThemeStyleMapper } from '#src/business/enum/theme-style-mapper-enum'
import { ThemeSystemSchemeMapper } from '#src/business/enum/theme-system-scheme-mapper-enum'
import {
  type ThemePreference,
  type ThemePreferenceStorage,
  type ThemeSystemScheme,
} from '#src/business/model/theme-preference'

export class ThemePreferenceService {
  parsePreference(params: { value: string | null }): ThemePreference {
    const { value } = params
    const valueParts = this._splitValue({ value: value ?? '' })

    return {
      scheme: this._parseScheme({ value: valueParts.schemeValue }),
      style: this._parseStyle({ value: valueParts.styleValue }),
    }
  }

  resolveScheme(params: {
    scheme: ThemeSchemePreferenceMapper
    systemScheme: ThemeSystemScheme
  }): EffectiveThemeSchemeMapper {
    const { scheme, systemScheme } = params
    switch (scheme) {
      case ThemeSchemePreferenceMapper.DARK:
        return EffectiveThemeSchemeMapper.DARK
      case ThemeSchemePreferenceMapper.LIGHT:
        return EffectiveThemeSchemeMapper.LIGHT
      case ThemeSchemePreferenceMapper.SYSTEM:
        return this._resolveSystemScheme({ systemScheme })
      default:
        return this._resolveSystemScheme({ systemScheme })
    }
  }

  resolveTheme(params: { preference: ThemePreference; systemScheme: ThemeSystemScheme }): EffectiveThemeMapper {
    const { preference, systemScheme } = params
    const scheme = this.resolveScheme({ scheme: preference.scheme, systemScheme })

    switch (`${preference.style}:${scheme}`) {
      case 'eink:dark':
        return EffectiveThemeMapper.EINK_DARK
      case 'eink:light':
        return EffectiveThemeMapper.EINK_LIGHT
      case 'paper:dark':
        return EffectiveThemeMapper.PAPER_DARK
      case 'paper:light':
        return EffectiveThemeMapper.PAPER_LIGHT
      default:
        return EffectiveThemeMapper.PAPER_LIGHT
    }
  }

  serializePreference(params: { preference: ThemePreference }): string {
    const { preference } = params

    return `${preference.style}:${preference.scheme}`
  }

  async loadPreference(params: { storage: ThemePreferenceStorage }): Promise<ThemePreference> {
    const { storage } = params
    const storedValue = await storage.readPreference()

    return this.parsePreference({ value: storedValue })
  }

  async savePreference(params: { preference: ThemePreference; storage: ThemePreferenceStorage }): Promise<void> {
    const { preference, storage } = params
    await storage.writePreference({ value: this.serializePreference({ preference }) })
  }

  protected _splitValue(params: { value: string }): { schemeValue: string; styleValue: string } {
    const { value } = params
    const separatorIndex = value.indexOf(':')

    if (separatorIndex === -1) {
      return { schemeValue: value, styleValue: '' }
    }

    return {
      schemeValue: value.slice(separatorIndex + 1),
      styleValue: value.slice(0, separatorIndex),
    }
  }

  protected _parseScheme(params: { value: string }): ThemeSchemePreferenceMapper {
    const { value } = params
    switch (value) {
      case ThemeSchemePreferenceMapper.DARK:
        return ThemeSchemePreferenceMapper.DARK
      case ThemeSchemePreferenceMapper.LIGHT:
        return ThemeSchemePreferenceMapper.LIGHT
      case ThemeSchemePreferenceMapper.SYSTEM:
        return ThemeSchemePreferenceMapper.SYSTEM
      default:
        return ThemeSchemePreferenceMapper.SYSTEM
    }
  }

  protected _parseStyle(params: { value: string }): ThemeStyleMapper {
    const { value } = params
    switch (value) {
      case ThemeStyleMapper.EINK:
        return ThemeStyleMapper.EINK
      case ThemeStyleMapper.PAPER:
        return ThemeStyleMapper.PAPER
      default:
        return ThemeStyleMapper.PAPER
    }
  }

  protected _resolveSystemScheme(params: { systemScheme: ThemeSystemScheme }): EffectiveThemeSchemeMapper {
    const { systemScheme } = params
    if (systemScheme === ThemeSystemSchemeMapper.DARK) {
      return EffectiveThemeSchemeMapper.DARK
    }

    return EffectiveThemeSchemeMapper.LIGHT
  }
}
