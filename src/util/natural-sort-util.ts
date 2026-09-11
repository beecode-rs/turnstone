export const naturalSortUtil = {
  _compareDigitTokens(params: { left: string; right: string }): number {
    const { left, right } = params
    const normalizedLeft = naturalSortUtil._stripLeadingZeros({ value: left })
    const normalizedRight = naturalSortUtil._stripLeadingZeros({ value: right })
    if (normalizedLeft.length !== normalizedRight.length) {
      return naturalSortUtil._compareNumbers({ left: normalizedLeft.length, right: normalizedRight.length })
    }

    return naturalSortUtil._compareStrings({ left: normalizedLeft, right: normalizedRight })
  },

  _compareNumbers(params: { left: number; right: number }): number {
    const { left, right } = params
    if (left < right) {
      return -1
    }
    if (left > right) {
      return 1
    }

    return 0
  },

  _compareStrings(params: { left: string; right: string }): number {
    const { left, right } = params
    if (left < right) {
      return -1
    }
    if (left > right) {
      return 1
    }

    return 0
  },

  _compareStringsCaseInsensitive(params: { left: string; right: string }): number {
    const { left, right } = params

    return naturalSortUtil._compareStrings({ left: left.toLowerCase(), right: right.toLowerCase() })
  },

  _compareTokens(params: { left: string; right: string }): number {
    const { left, right } = params
    if (naturalSortUtil._isDigitToken(left) && naturalSortUtil._isDigitToken(right)) {
      return naturalSortUtil._compareDigitTokens({ left, right })
    }

    return naturalSortUtil._compareStringsCaseInsensitive({ left, right })
  },

  _isDigitToken(value: string): boolean {
    return /^\d+$/.test(value)
  },

  _stripLeadingZeros(params: { value: string }): string {
    const { value } = params
    const stripped = value.replace(/^0+/, '')
    if (stripped === '') {
      return '0'
    }

    return stripped
  },

  _tokenize(params: { value: string }): string[] {
    const { value } = params

    return value.split(/(\d+)/).filter((token) => {
      return token !== ''
    })
  },

  compare(a: string, b: string): number {
    const tokensA = naturalSortUtil._tokenize({ value: a })
    const tokensB = naturalSortUtil._tokenize({ value: b })
    const pairCount = Math.min(tokensA.length, tokensB.length)
    const firstDifference = tokensA
      .slice(0, pairCount)
      .map((tokenA, index) => {
        return naturalSortUtil._compareTokens({ left: tokenA, right: tokensB[index] })
      })
      .find((result) => {
        return result !== 0
      })
    if (firstDifference !== undefined) {
      return firstDifference
    }
    if (tokensA.length !== tokensB.length) {
      return naturalSortUtil._compareNumbers({ left: tokensA.length, right: tokensB.length })
    }

    return naturalSortUtil._compareStringsCaseInsensitive({ left: a, right: b })
  },
}
