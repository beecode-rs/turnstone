export const versionCompareUtil = {
  _compareNumberPair(params: { left: number; right: number }): number {
    const { left, right } = params
    if (left < right) {
      return -1
    }
    if (left > right) {
      return 1
    }

    return 0
  },

  _compareParts(params: { left: number | undefined; right: number | undefined }): number {
    const { left, right } = params

    return versionCompareUtil._compareNumberPair({ left: left ?? 0, right: right ?? 0 })
  },

  _parsePart(params: { value: string }): number {
    const { value } = params
    const parsed = Number.parseInt(value, 10)
    if (Number.isNaN(parsed)) {
      return 0
    }

    return parsed
  },

  _splitParts(params: { value: string }): number[] {
    const { value } = params

    return value
      .replace(/^v/i, '')
      .split('.')
      .map((part) => {
        return versionCompareUtil._parsePart({ value: part })
      })
  },

  compare(params: { left: string; right: string }): number {
    const { left, right } = params
    const leftParts = versionCompareUtil._splitParts({ value: left })
    const rightParts = versionCompareUtil._splitParts({ value: right })
    const partCount = Math.max(leftParts.length, rightParts.length)
    const firstDifference = Array.from({ length: partCount }, (_part, index) => {
      return versionCompareUtil._compareParts({ left: leftParts[index], right: rightParts[index] })
    }).find((result) => {
      return result !== 0
    })
    if (firstDifference !== undefined) {
      return firstDifference
    }

    return 0
  },
}
