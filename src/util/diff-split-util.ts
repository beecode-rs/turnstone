import { GitDiffChangeTypeMapper } from '#src/business/enum/git-diff-change-type-mapper-enum'

export type DiffSplitLine = {
  content: string
  newLineNumber: number | null
  oldLineNumber: number | null
  type: GitDiffChangeTypeMapper
}

export type DiffSplitPair = {
  left: DiffSplitLine | null
  right: DiffSplitLine | null
}

interface SplitWalkState {
  pairs: DiffSplitPair[]
  pendingAdds: DiffSplitLine[]
  pendingDels: DiffSplitLine[]
}

const diffSplitUtil = {
  _applyChange(params: { change: DiffSplitLine; state: SplitWalkState }): SplitWalkState {
    const { change, state } = params
    if (change.type === GitDiffChangeTypeMapper.DEL) {
      return {
        pairs: state.pairs,
        pendingAdds: state.pendingAdds,
        pendingDels: [...state.pendingDels, change],
      }
    }
    if (change.type === GitDiffChangeTypeMapper.ADD) {
      return {
        pairs: state.pairs,
        pendingAdds: [...state.pendingAdds, change],
        pendingDels: state.pendingDels,
      }
    }

    return {
      pairs: [
        ...state.pairs,
        ...diffSplitUtil._flushPending({ adds: state.pendingAdds, dels: state.pendingDels }),
        diffSplitUtil._toContextPair({ change }),
      ],
      pendingAdds: [],
      pendingDels: [],
    }
  },
  _flushPending(params: { adds: DiffSplitLine[]; dels: DiffSplitLine[] }): DiffSplitPair[] {
    const { adds, dels } = params
    const pairedCount = Math.min(dels.length, adds.length)
    const pairedPairs = dels.slice(0, pairedCount).map((del, index): DiffSplitPair => {
      return { left: del, right: adds[index] }
    })
    const delOnlyPairs = dels.slice(pairedCount).map((del): DiffSplitPair => {
      return { left: del, right: null }
    })
    const addOnlyPairs = adds.slice(pairedCount).map((add): DiffSplitPair => {
      return { left: null, right: add }
    })

    return [...pairedPairs, ...delOnlyPairs, ...addOnlyPairs]
  },
  _toContextPair(params: { change: DiffSplitLine }): DiffSplitPair {
    const { change } = params

    return { left: change, right: change }
  },
  toAlignedPairs(params: { changes: DiffSplitLine[] }): DiffSplitPair[] {
    const { changes } = params
    const walkState = changes.reduce<SplitWalkState>(
      (state, change): SplitWalkState => {
        return diffSplitUtil._applyChange({ change, state })
      },
      { pairs: [], pendingAdds: [], pendingDels: [] },
    )

    return [
      ...walkState.pairs,
      ...diffSplitUtil._flushPending({ adds: walkState.pendingAdds, dels: walkState.pendingDels }),
    ]
  },
}

export { diffSplitUtil }
