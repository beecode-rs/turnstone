import * as SecureStore from 'expo-secure-store'

import { constant } from '#src/util/constant'

export type StoredCredentials = {
  passphrase?: string
  password?: string
  privateKey?: string
}

export class CredentialDal {
  async find(params: { hostId: string }): Promise<StoredCredentials | null> {
    const { hostId } = params
    const [passphrase, password, privateKey] = await Promise.all([
      this._readSecret({ hostId, kind: constant.credential.keyKind.passphrase }),
      this._readSecret({ hostId, kind: constant.credential.keyKind.password }),
      this._readSecret({ hostId, kind: constant.credential.keyKind.privateKey }),
    ])
    if (!passphrase && !password && !privateKey) {
      return null
    }

    return {
      passphrase: passphrase ?? undefined,
      password: password ?? undefined,
      privateKey: privateKey ?? undefined,
    }
  }

  async save(params: { credentials: StoredCredentials; hostId: string }): Promise<void> {
    const { credentials, hostId } = params
    await this._writeSecret({ hostId, kind: constant.credential.keyKind.passphrase, value: credentials.passphrase })
    await this._writeSecret({ hostId, kind: constant.credential.keyKind.password, value: credentials.password })
    await this._writeSecret({
      hostId,
      kind: constant.credential.keyKind.privateKey,
      value: credentials.privateKey,
    })
  }

  async remove(params: { hostId: string }): Promise<void> {
    const { hostId } = params
    await this._deleteSecret({ hostId, kind: constant.credential.keyKind.passphrase })
    await this._deleteSecret({ hostId, kind: constant.credential.keyKind.password })
    await this._deleteSecret({ hostId, kind: constant.credential.keyKind.privateKey })
  }

  protected async _readSecret(params: { hostId: string; kind: string }): Promise<string | null> {
    const { hostId, kind } = params

    return SecureStore.getItemAsync(this._entryKey({ hostId, kind }))
  }

  protected async _writeSecret(params: { hostId: string; kind: string; value?: string }): Promise<void> {
    const { hostId, kind, value } = params
    const key = this._entryKey({ hostId, kind })
    if (!value) {
      await SecureStore.deleteItemAsync(key)

      return
    }
    await SecureStore.setItemAsync(key, value)
  }

  protected async _deleteSecret(params: { hostId: string; kind: string }): Promise<void> {
    const { hostId, kind } = params
    await SecureStore.deleteItemAsync(this._entryKey({ hostId, kind }))
  }

  protected _entryKey(params: { hostId: string; kind: string }): string {
    const { hostId, kind } = params

    return `${constant.credential.keyPrefix}${kind}-${hostId}`
  }
}
