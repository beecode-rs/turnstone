import { type OpenScreensRecord } from '#src/business/model/open-screens'
import { appMmkv } from '#src/lib/mmkv'
import { constant } from '#src/util/constant'

export class OpenScreensDal {
  read(params: { hostId: string }): OpenScreensRecord | null {
    const { hostId } = params
    const serialized = appMmkv.getString(this._buildKey({ hostId }))
    if (!serialized) {
      return null
    }

    return JSON.parse(serialized) as OpenScreensRecord
  }

  write(params: { hostId: string; record: OpenScreensRecord }): void {
    const { hostId, record } = params
    appMmkv.set(this._buildKey({ hostId }), JSON.stringify(record))
  }

  remove(params: { hostId: string }): void {
    const { hostId } = params
    appMmkv.remove(this._buildKey({ hostId }))
  }

  protected _buildKey(params: { hostId: string }): string {
    const { hostId } = params

    return `${constant.openScreens.storageKeyPrefix}${hostId}`
  }
}
