export const treeExpansionUtil = {
  toExpandedPathsList(params: { expandedPaths: Record<string, boolean> }): string[] {
    const { expandedPaths } = params

    return Object.entries(expandedPaths)
      .filter(([, isExpanded]) => {
        return isExpanded
      })
      .map(([path]) => {
        return path
      })
  },

  toExpandedPathsMap(params: { paths: string[] }): Record<string, boolean> {
    const { paths } = params

    return paths.reduce<Record<string, boolean>>((expandedPaths, path) => {
      return { ...expandedPaths, [path]: true }
    }, {})
  },
}
