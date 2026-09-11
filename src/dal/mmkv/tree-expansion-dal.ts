import { type TreeExpansionRecord } from '#src/business/model/tree-expansion'
import { appMmkv } from '#src/lib/mmkv'
import { constant } from '#src/util/constant'

export class TreeExpansionDal {
  read(params: { hostId: string }): TreeExpansionRecord | null {
    const { hostId } = params
    const serialized = appMmkv.getString(this._buildKey({ hostId }))
    if (!serialized) {
      return null
    }

    return JSON.parse(serialized) as TreeExpansionRecord
  }

  write(params: { hostId: string; record: TreeExpansionRecord }): void {
    const { hostId, record } = params
    appMmkv.set(this._buildKey({ hostId }), JSON.stringify(record))
  }

  remove(params: { hostId: string }): void {
    const { hostId } = params
    appMmkv.remove(this._buildKey({ hostId }))
  }

  protected _buildKey(params: { hostId: string }): string {
    const { hostId } = params

    return `${constant.treeExpansion.storageKeyPrefix}${hostId}`
  }
}
