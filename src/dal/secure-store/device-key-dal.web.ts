import { type DeviceKeyInfo, type DeviceKeyStore } from '#src/business/model/device-key'
import { appMmkv } from '#src/lib/mmkv'
import { constant } from '#src/util/constant'

export class DeviceKeyDal implements DeviceKeyStore {
  find(): Promise<DeviceKeyInfo | null> {
    return Promise.resolve(this._parseSerialized(appMmkv.getString(constant.deviceKey.itemKey)))
  }

  remove(): Promise<void> {
    appMmkv.remove(constant.deviceKey.itemKey)

    return Promise.resolve()
  }

  save(params: { keyInfo: DeviceKeyInfo }): Promise<void> {
    const { keyInfo } = params
    appMmkv.set(constant.deviceKey.itemKey, JSON.stringify(keyInfo))

    return Promise.resolve()
  }

  protected _isDeviceKeyInfo(value: unknown): value is DeviceKeyInfo {
    if (typeof value !== 'object' || value === null) {
      return false
    }
    const candidate = value as Record<string, unknown>

    return ['comment', 'createdAt', 'fingerprint', 'privateKey', 'publicKey'].every((field) => {
      return typeof candidate[field] === 'string' && candidate[field] !== ''
    })
  }

  protected _parseSerialized(serialized: string | undefined): DeviceKeyInfo | null {
    if (serialized === undefined || serialized === '') {
      return null
    }
    try {
      const parsed = JSON.parse(serialized) as unknown
      if (this._isDeviceKeyInfo(parsed)) {
        return parsed
      }

      return null
    } catch {
      return null
    }
  }
}
