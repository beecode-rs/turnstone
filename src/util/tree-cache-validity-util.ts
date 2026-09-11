export const treeCacheValidityUtil = {
  isCacheValid(params: { cache: { dirMtime: number } | null; currentDirMtime: number }): boolean {
    const { cache, currentDirMtime } = params
    if (!cache) {
      return false
    }

    return cache.dirMtime === currentDirMtime
  },
}
