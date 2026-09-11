interface FuzzyWalkState {
  adjacencyCount: number
  lastMatchedIndex: number
  matchedCount: number
  matchedIndices: number[]
}

const fuzzyScoreUtil = {
  _adjacencyWeight: 10,
  _completeWalk(params: { query: string; target: string }): FuzzyWalkState | null {
    const { query, target } = params
    if (query === '' || query.length > target.length) {
      return null
    }
    const loweredQuery = query.toLowerCase()
    const loweredTarget = target.toLowerCase()
    const walkState = fuzzyScoreUtil._walkTarget({ query: loweredQuery, target: loweredTarget })
    if (walkState.matchedCount < loweredQuery.length) {
      return null
    }

    return walkState
  },
  _exactMatchBonus: 1000,
  _walkTarget(params: { query: string; target: string }): FuzzyWalkState {
    const { query, target } = params

    return target.split('').reduce(
      (state: FuzzyWalkState, char: string, charIndex: number) => {
        if (state.matchedCount >= query.length) {
          return state
        }
        if (char !== query.charAt(state.matchedCount)) {
          return state
        }
        if (state.lastMatchedIndex === charIndex - 1) {
          return {
            adjacencyCount: state.adjacencyCount + 1,
            lastMatchedIndex: charIndex,
            matchedCount: state.matchedCount + 1,
            matchedIndices: [...state.matchedIndices, charIndex],
          }
        }

        return {
          adjacencyCount: state.adjacencyCount,
          lastMatchedIndex: charIndex,
          matchedCount: state.matchedCount + 1,
          matchedIndices: [...state.matchedIndices, charIndex],
        }
      },
      { adjacencyCount: 0, lastMatchedIndex: -2, matchedCount: 0, matchedIndices: [] },
    )
  },
  matchIndices(params: { query: string; target: string }): number[] {
    const { query, target } = params
    const walkState = fuzzyScoreUtil._completeWalk({ query, target })
    if (walkState === null) {
      return []
    }

    return walkState.matchedIndices
  },
  score(params: { query: string; target: string }): number | null {
    const { query, target } = params
    const walkState = fuzzyScoreUtil._completeWalk({ query, target })
    if (walkState === null) {
      return null
    }
    const loweredQuery = query.toLowerCase()
    const loweredTarget = target.toLowerCase()
    const subsequenceScore = loweredQuery.length + walkState.adjacencyCount * fuzzyScoreUtil._adjacencyWeight
    if (loweredQuery === loweredTarget) {
      return fuzzyScoreUtil._exactMatchBonus + subsequenceScore
    }

    return subsequenceScore
  },
}

export { fuzzyScoreUtil }
