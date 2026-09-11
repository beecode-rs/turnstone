import { randomBytes } from 'crypto'
import Constants from 'expo-constants'
import * as Device from 'expo-device'
import { getKeys } from 'micro-key-producer/ssh.js'
import { Platform } from 'react-native'

import { type DeviceKeyInfo, type DeviceKeyStore } from '#src/business/model/device-key'
import { constant } from '#src/util/constant'
import { deviceKeyNameUtil } from '#src/util/device-key-name-util'

export type DeviceKeyServiceParams = {
  deviceKeyDal: DeviceKeyStore
}

export class DeviceKeyService {
  protected _inFlight: Promise<DeviceKeyInfo> | null = null
  protected readonly _params: DeviceKeyServiceParams

  constructor(params: DeviceKeyServiceParams) {
    this._params = params
  }

  async find(): Promise<DeviceKeyInfo | null> {
    return this._params.deviceKeyDal.find()
  }

  async getOrCreate(): Promise<DeviceKeyInfo> {
    if (this._inFlight !== null) {
      return this._inFlight
    }
    this._inFlight = this._resolveDeviceKey().finally(() => {
      this._inFlight = null
    })

    return this._inFlight
  }

  async regenerate(): Promise<DeviceKeyInfo> {
    return this._createDeviceKey()
  }

  async rename(params: { comment: string }): Promise<DeviceKeyInfo | null> {
    const { comment } = params
    const existing = await this._params.deviceKeyDal.find()
    if (existing === null) {
      return null
    }
    const trimmedComment = comment.trim()
    if (trimmedComment === '') {
      return existing
    }
    const keyInfo = {
      ...existing,
      comment: trimmedComment,
      publicKey: deviceKeyNameUtil.toPublicKeyWithComment({ comment: trimmedComment, publicKey: existing.publicKey }),
    }
    await this._params.deviceKeyDal.save({ keyInfo })

    return keyInfo
  }

  async remove(): Promise<void> {
    await this._params.deviceKeyDal.remove()
  }

  protected async _createDeviceKey(): Promise<DeviceKeyInfo> {
    const keyInfo = this._generateDeviceKeyInfo()
    await this._params.deviceKeyDal.save({ keyInfo })

    return keyInfo
  }

  protected _generateDeviceKeyInfo(): DeviceKeyInfo {
    const comment = deviceKeyNameUtil.toComment({
      appName: this._toAppName(),
      deviceName: this._toDeviceName(),
      platform: Platform.OS,
    })
    const keys = getKeys(randomBytes(32), comment)

    return {
      comment,
      createdAt: new Date().toISOString(),
      fingerprint: keys.fingerprint,
      privateKey: keys.privateKey,
      publicKey: keys.publicKey,
    }
  }

  protected async _resolveDeviceKey(): Promise<DeviceKeyInfo> {
    const existing = await this._params.deviceKeyDal.find()
    if (existing !== null) {
      return existing
    }

    return this._createDeviceKey()
  }

  protected _toAppName(): string {
    return (
      deviceKeyNameUtil.toSanitizedName(Constants.expoConfig?.name ?? Constants.expoConfig?.slug ?? '') ||
      constant.deviceKey.appNameFallback
    )
  }

  protected _toDeviceName(): string {
    return (
      deviceKeyNameUtil.toSanitizedName(Device.deviceName ?? Device.modelName ?? '') ||
      constant.deviceKey.deviceNameFallback
    )
  }
}
