export const markdownImageSizeUtil = {
  resolveAttrWidth(params: { widthAttr: string | null }): number | null {
    const { widthAttr } = params
    if (widthAttr === null || !/^\d+$/.test(widthAttr)) {
      return null
    }

    return Number.parseInt(widthAttr, 10)
  },
  resolveTargetWidth(params: {
    attrWidth: number | null
    maxWidth: number
    sourceSize: { height: number; width: number } | null
  }): number {
    const { attrWidth, maxWidth, sourceSize } = params
    if (attrWidth !== null) {
      return Math.min(attrWidth, maxWidth)
    }
    const intrinsicWidth = sourceSize?.width
    if (intrinsicWidth !== undefined && intrinsicWidth > 0) {
      return Math.min(intrinsicWidth, maxWidth)
    }

    return maxWidth
  },
}
