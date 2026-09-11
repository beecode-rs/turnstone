import { type TreeCacheRecord } from '#src/business/model/tree-cache'
import { appMmkv } from '#src/lib/mmkv'
import { constant } from '#src/util/constant'
import { treeCacheValidityUtil } from '#src/util/tree-cache-validity-util'

export class TreeCacheDal {
  read(params: { hostId: string; path: string }): TreeCacheRecord | null {
    const { hostId, path } = params
    const serialized = appMmkv.getString(this._buildKey({ hostId, path }))
    if (!serialized) {
      return null
    }

    return JSON.parse(serialized) as TreeCacheRecord
  }

  write(params: { hostId: string; path: string; record: TreeCacheRecord }): void {
    const { hostId, path, record } = params
    appMmkv.set(this._buildKey({ hostId, path }), JSON.stringify(record))
  }

  isCacheValid(params: { hostId: string; path: string; currentDirMtime: number }): boolean {
    const { hostId, path, currentDirMtime } = params

    return treeCacheValidityUtil.isCacheValid({
      cache: this.read({ hostId, path }),
      currentDirMtime,
    })
  }

  protected _buildKey(params: { hostId: string; path: string }): string {
    const { hostId, path } = params

    return `${constant.treeCache.storageKeyPrefix}${hostId}#${path}`
  }
}
