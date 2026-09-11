import Constants from 'expo-constants'
import * as SecureStore from 'expo-secure-store'

import { type DeviceKeyInfo, type DeviceKeyStore } from '#src/business/model/device-key'
import { constant } from '#src/util/constant'

export class DeviceKeyDal implements DeviceKeyStore {
  async find(): Promise<DeviceKeyInfo | null> {
    const keyInfo = this._parseSerialized(
      await SecureStore.getItemAsync(constant.deviceKey.itemKey, this._secureStoreOptions()),
    )
    if (keyInfo !== null) {
      return keyInfo
    }

    return this._migrateUngroupedItem()
  }

  async remove(): Promise<void> {
    await SecureStore.deleteItemAsync(constant.deviceKey.itemKey, this._secureStoreOptions())
  }

  async save(params: { keyInfo: DeviceKeyInfo }): Promise<void> {
    const { keyInfo } = params
    await SecureStore.setItemAsync(constant.deviceKey.itemKey, JSON.stringify(keyInfo), this._secureStoreOptions())
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

  protected async _migrateUngroupedItem(): Promise<DeviceKeyInfo | null> {
    if (this._toRuntimeAccessGroup() === undefined) {
      return null
    }
    const keyInfo = this._parseSerialized(
      await SecureStore.getItemAsync(constant.deviceKey.itemKey, this._ungroupedSecureStoreOptions()),
    )
    if (keyInfo === null) {
      return null
    }
    await this.save({ keyInfo })

    return keyInfo
  }

  protected _parseSerialized(serialized: string | null): DeviceKeyInfo | null {
    if (serialized === null) {
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

  protected _secureStoreOptions(): SecureStore.SecureStoreOptions {
    const accessGroup = this._toRuntimeAccessGroup()
    if (accessGroup === undefined) {
      return this._ungroupedSecureStoreOptions()
    }

    return { ...this._ungroupedSecureStoreOptions(), accessGroup }
  }

  protected _toRuntimeAccessGroup(): string | undefined {
    const extra = Constants.expoConfig?.extra as { beecodeTeamId?: unknown } | undefined
    const teamId = extra?.beecodeTeamId
    if (typeof teamId !== 'string' || teamId === '') {
      return undefined
    }

    return `${teamId}.${constant.deviceKey.accessGroup}`
  }

  protected _ungroupedSecureStoreOptions(): SecureStore.SecureStoreOptions {
    return {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      keychainService: constant.deviceKey.keychainService,
    }
  }
}
