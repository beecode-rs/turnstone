import { DefaultTheme } from 'expo-router'
import { type MD3Theme } from 'react-native-paper'

import { EffectiveThemeMapper } from '#src/business/enum/effective-theme-mapper-enum'
import { EffectiveThemeSchemeMapper } from '#src/business/enum/effective-theme-scheme-mapper-enum'
import { ThemedColorMapper } from '#src/business/enum/themed-color-mapper-enum'
import { EinkTheme } from '#src/ui-component/theme/eink-theme'
import { PaperTheme } from '#src/ui-component/theme/paper-theme'
import { BlueRamp, GrayRamp } from '#src/util/theme-constant'

interface DiffColors {
  add: string
  remove: string
}

export type TreeStatusStyle = {
  color: string
  fontWeight: '400' | '700'
}

export type TreeStatusColors = {
  changed: TreeStatusStyle
  untracked: TreeStatusStyle
}

const DIFF_COLORS: Record<EffectiveThemeMapper, DiffColors> = {
  [EffectiveThemeMapper.EINK_DARK]: { add: GrayRamp.white, remove: GrayRamp.gray300 },
  [EffectiveThemeMapper.EINK_LIGHT]: { add: GrayRamp.black, remove: GrayRamp.gray500 },
  [EffectiveThemeMapper.PAPER_DARK]: { add: '#7BD88F', remove: '#FFB4AB' },
  [EffectiveThemeMapper.PAPER_LIGHT]: { add: '#1B7F3B', remove: '#BA1A1A' },
}

const TREE_STATUS_COLORS: Record<EffectiveThemeMapper, TreeStatusColors> = {
  [EffectiveThemeMapper.EINK_DARK]: {
    changed: { color: GrayRamp.gray300, fontWeight: '400' },
    untracked: { color: GrayRamp.white, fontWeight: '700' },
  },
  [EffectiveThemeMapper.EINK_LIGHT]: {
    changed: { color: GrayRamp.gray500, fontWeight: '400' },
    untracked: { color: GrayRamp.black, fontWeight: '700' },
  },
  [EffectiveThemeMapper.PAPER_DARK]: {
    changed: { color: BlueRamp.blue300, fontWeight: '400' },
    untracked: { color: '#7BD88F', fontWeight: '400' },
  },
  [EffectiveThemeMapper.PAPER_LIGHT]: {
    changed: { color: BlueRamp.blue700, fontWeight: '400' },
    untracked: { color: '#1B7F3B', fontWeight: '400' },
  },
}

export const effectiveThemeUtil = {
  resolveDiffColors(params: { theme: EffectiveThemeMapper }): DiffColors {
    return DIFF_COLORS[params.theme]
  },

  resolveMd3Theme(params: { theme: EffectiveThemeMapper }): MD3Theme {
    switch (params.theme) {
      case EffectiveThemeMapper.EINK_DARK:
        return EinkTheme.dark
      case EffectiveThemeMapper.EINK_LIGHT:
        return EinkTheme.light
      case EffectiveThemeMapper.PAPER_DARK:
        return PaperTheme.dark
      case EffectiveThemeMapper.PAPER_LIGHT:
        return PaperTheme.light
      default:
        return PaperTheme.light
    }
  },

  resolveNavigationTheme(params: { md3Theme: MD3Theme; scheme: EffectiveThemeSchemeMapper }): typeof DefaultTheme {
    return {
      colors: {
        background: params.md3Theme.colors.background,
        border: params.md3Theme.colors.outlineVariant,
        card: params.md3Theme.colors.surface,
        notification: params.md3Theme.colors.error,
        primary: params.md3Theme.colors.primary,
        text: params.md3Theme.colors.onSurface,
      },
      dark: params.scheme === EffectiveThemeSchemeMapper.DARK,
      fonts: DefaultTheme.fonts,
    }
  },

  resolveThemedColor(params: { color: ThemedColorMapper; md3Theme: MD3Theme }): string {
    switch (params.color) {
      case ThemedColorMapper.BACKGROUND:
        return params.md3Theme.colors.background
      case ThemedColorMapper.BACKGROUND_ELEMENT:
        return params.md3Theme.colors.surfaceVariant
      case ThemedColorMapper.BACKGROUND_SELECTED:
        return params.md3Theme.colors.secondaryContainer
      case ThemedColorMapper.TEXT:
        return params.md3Theme.colors.onSurface
      case ThemedColorMapper.TEXT_SECONDARY:
        return params.md3Theme.colors.onSurfaceVariant
      default:
        return params.md3Theme.colors.onSurface
    }
  },

  resolveTreeStatusColors(params: { theme: EffectiveThemeMapper }): TreeStatusColors {
    return TREE_STATUS_COLORS[params.theme]
  },
}
