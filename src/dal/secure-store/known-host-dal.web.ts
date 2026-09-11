import { appMmkv } from '#src/lib/mmkv'
import { constant } from '#src/util/constant'

export type StoredKnownHost = {
  fingerprint: string
  hostKeyBase64: string
}

export class KnownHostDal {
  find(params: { hostId: string }): Promise<StoredKnownHost | null> {
    const { hostId } = params
    const serialized = appMmkv.getString(this._entryKey({ hostId }))
    if (!serialized) {
      return Promise.resolve(null)
    }

    return Promise.resolve(JSON.parse(serialized) as StoredKnownHost)
  }

  save(params: { hostId: string; knownHost: StoredKnownHost }): Promise<void> {
    const { hostId, knownHost } = params
    appMmkv.set(this._entryKey({ hostId }), JSON.stringify(knownHost))

    return Promise.resolve()
  }

  remove(params: { hostId: string }): Promise<void> {
    const { hostId } = params
    appMmkv.remove(this._entryKey({ hostId }))

    return Promise.resolve()
  }

  protected _entryKey(params: { hostId: string }): string {
    const { hostId } = params

    return `${constant.knownHost.keyPrefix}${hostId}`
  }
}
