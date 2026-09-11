import { FontSizePreferenceMapper } from '#src/business/enum/font-size-preference-mapper-enum'

export type FontSizeMetrics = {
  codeFontSizePx: number
  codeLineHeightPx: number
  markdownFontSizePx: number
  markdownHeadingScale: number
  markdownLineHeightPx: number
}

export const FONT_SIZE_METRICS: Record<FontSizePreferenceMapper, FontSizeMetrics> = {
  [FontSizePreferenceMapper.L]: {
    codeFontSizePx: 15,
    codeLineHeightPx: 23,
    markdownFontSizePx: 18,
    markdownHeadingScale: 1.125,
    markdownLineHeightPx: 25,
  },
  [FontSizePreferenceMapper.M]: {
    codeFontSizePx: 13,
    codeLineHeightPx: 20,
    markdownFontSizePx: 16,
    markdownHeadingScale: 1,
    markdownLineHeightPx: 22,
  },
  [FontSizePreferenceMapper.S]: {
    codeFontSizePx: 12,
    codeLineHeightPx: 18,
    markdownFontSizePx: 14,
    markdownHeadingScale: 0.875,
    markdownLineHeightPx: 20,
  },
  [FontSizePreferenceMapper.XL]: {
    codeFontSizePx: 17,
    codeLineHeightPx: 26,
    markdownFontSizePx: 20,
    markdownHeadingScale: 1.25,
    markdownLineHeightPx: 28,
  },
  [FontSizePreferenceMapper.XS]: {
    codeFontSizePx: 11,
    codeLineHeightPx: 17,
    markdownFontSizePx: 13,
    markdownHeadingScale: 0.8125,
    markdownLineHeightPx: 18,
  },
  [FontSizePreferenceMapper.XXL]: {
    codeFontSizePx: 19,
    codeLineHeightPx: 29,
    markdownFontSizePx: 24,
    markdownHeadingScale: 1.5,
    markdownLineHeightPx: 33,
  },
}
