import { TreeDensityPreferenceMapper } from '#src/business/enum/tree-density-preference-mapper-enum'

export type TreeDensityMetrics = {
  chevronSize: number
  entryIconSize: number
  fontSize: number
  horizontalPadding: number
  indentPerDepth: number
  rowHeight: number
}

export const TREE_DENSITY_METRICS: Record<TreeDensityPreferenceMapper, TreeDensityMetrics> = {
  [TreeDensityPreferenceMapper.COMPACT]: {
    chevronSize: 16,
    entryIconSize: 14,
    fontSize: 13,
    horizontalPadding: 6,
    indentPerDepth: 10,
    rowHeight: 28,
  },
  [TreeDensityPreferenceMapper.DEFAULT]: {
    chevronSize: 18,
    entryIconSize: 16,
    fontSize: 14,
    horizontalPadding: 8,
    indentPerDepth: 12,
    rowHeight: 32,
  },
  [TreeDensityPreferenceMapper.WIDE]: {
    chevronSize: 20,
    entryIconSize: 18,
    fontSize: 15,
    horizontalPadding: 12,
    indentPerDepth: 16,
    rowHeight: 40,
  },
}
