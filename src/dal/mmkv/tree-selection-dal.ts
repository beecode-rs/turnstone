import { type TreeSelectionRecord } from '#src/business/model/tree-selection'
import { appMmkv } from '#src/lib/mmkv'
import { constant } from '#src/util/constant'

export class TreeSelectionDal {
  read(params: { hostId: string }): TreeSelectionRecord | null {
    const { hostId } = params
    const serialized = appMmkv.getString(this._buildKey({ hostId }))
    if (!serialized) {
      return null
    }

    return JSON.parse(serialized) as TreeSelectionRecord
  }

  write(params: { hostId: string; record: TreeSelectionRecord }): void {
    const { hostId, record } = params
    appMmkv.set(this._buildKey({ hostId }), JSON.stringify(record))
  }

  remove(params: { hostId: string }): void {
    const { hostId } = params
    appMmkv.remove(this._buildKey({ hostId }))
  }

  protected _buildKey(params: { hostId: string }): string {
    const { hostId } = params

    return `${constant.treeSelection.storageKeyPrefix}${hostId}`
  }
}
