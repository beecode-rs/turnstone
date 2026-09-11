import { type DeviceKeyInfo } from '#src/business/model/device-key'
import { DeviceKeyService } from '#src/business/service/device-key-service'
import { DeviceKeyDal } from '#src/dal/secure-store/device-key-dal'

const deviceKeyService = new DeviceKeyService({ deviceKeyDal: new DeviceKeyDal() })

export const deviceKeyUseCase = {
  find: (): Promise<DeviceKeyInfo | null> => {
    return deviceKeyService.find()
  },

  regenerate: (): Promise<DeviceKeyInfo> => {
    return deviceKeyService.regenerate()
  },

  remove: (): Promise<void> => {
    return deviceKeyService.remove()
  },

  rename: (params: { comment: string }): Promise<DeviceKeyInfo | null> => {
    return deviceKeyService.rename(params)
  },
}
