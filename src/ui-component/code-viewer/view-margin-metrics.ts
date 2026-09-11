import { ViewMarginPreferenceMapper } from '#src/business/enum/view-margin-preference-mapper-enum'

export type ViewMarginMetrics = {
  codeHorizontal: number
  codeVertical: number
  markdownHorizontal: number
  markdownVertical: number
}

export const VIEW_MARGIN_METRICS: Record<ViewMarginPreferenceMapper, ViewMarginMetrics> = {
  [ViewMarginPreferenceMapper.COMPACT]: {
    codeHorizontal: 4,
    codeVertical: 4,
    markdownHorizontal: 8,
    markdownVertical: 6,
  },
  [ViewMarginPreferenceMapper.LARGE]: {
    codeHorizontal: 24,
    codeVertical: 16,
    markdownHorizontal: 32,
    markdownVertical: 20,
  },
  [ViewMarginPreferenceMapper.NORMAL]: {
    codeHorizontal: 12,
    codeVertical: 8,
    markdownHorizontal: 16,
    markdownVertical: 12,
  },
}
