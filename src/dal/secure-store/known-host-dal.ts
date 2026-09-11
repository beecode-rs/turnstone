import * as SecureStore from 'expo-secure-store'

import { constant } from '#src/util/constant'

export type StoredKnownHost = {
  fingerprint: string
  hostKeyBase64: string
}

export class KnownHostDal {
  async find(params: { hostId: string }): Promise<StoredKnownHost | null> {
    const { hostId } = params
    const serialized = await SecureStore.getItemAsync(this._entryKey({ hostId }))
    if (!serialized) {
      return null
    }

    return JSON.parse(serialized) as StoredKnownHost
  }

  async save(params: { hostId: string; knownHost: StoredKnownHost }): Promise<void> {
    const { hostId, knownHost } = params
    await SecureStore.setItemAsync(this._entryKey({ hostId }), JSON.stringify(knownHost))
  }

  async remove(params: { hostId: string }): Promise<void> {
    const { hostId } = params
    await SecureStore.deleteItemAsync(this._entryKey({ hostId }))
  }

  protected _entryKey(params: { hostId: string }): string {
    const { hostId } = params

    return `${constant.knownHost.keyPrefix}${hostId}`
  }
}
