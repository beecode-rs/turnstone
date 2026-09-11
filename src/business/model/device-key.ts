export type DeviceKeyInfo = {
  comment: string
  createdAt: string
  fingerprint: string
  privateKey: string
  publicKey: string
}

export type DeviceKeyPublicInfo = Omit<DeviceKeyInfo, 'privateKey'>

export interface DeviceKeyStore {
  find(): Promise<DeviceKeyInfo | null>
  remove(): Promise<void>
  save(params: { keyInfo: DeviceKeyInfo }): Promise<void>
}
