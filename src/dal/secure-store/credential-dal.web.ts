import { appMmkv } from '#src/lib/mmkv'
import { constant } from '#src/util/constant'

export type StoredCredentials = {
  passphrase?: string
  password?: string
  privateKey?: string
}

export class CredentialDal {
  find(params: { hostId: string }): Promise<StoredCredentials | null> {
    const { hostId } = params
    const serialized = appMmkv.getString(this._entryKey({ hostId }))
    if (!serialized) {
      return Promise.resolve(null)
    }

    return Promise.resolve(JSON.parse(serialized) as StoredCredentials)
  }

  save(params: { credentials: StoredCredentials; hostId: string }): Promise<void> {
    const { credentials, hostId } = params
    const key = this._entryKey({ hostId })
    const hasSecret =
      Boolean(credentials.passphrase) || Boolean(credentials.password) || Boolean(credentials.privateKey)
    if (!hasSecret) {
      appMmkv.remove(key)

      return Promise.resolve()
    }
    appMmkv.set(key, JSON.stringify(credentials))

    return Promise.resolve()
  }

  remove(params: { hostId: string }): Promise<void> {
    const { hostId } = params
    appMmkv.remove(this._entryKey({ hostId }))

    return Promise.resolve()
  }

  protected _entryKey(params: { hostId: string }): string {
    const { hostId } = params

    return `${constant.credential.keyPrefix}${hostId}`
  }
}
