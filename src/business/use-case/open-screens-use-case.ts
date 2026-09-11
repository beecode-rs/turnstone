import { type OpenScreensRecord } from '#src/business/model/open-screens'
import { OpenScreensDal } from '#src/dal/mmkv/open-screens-dal'

const openScreensDal = new OpenScreensDal()

export const openScreensUseCase = {
  loadOpenScreens(params: { hostId: string }): OpenScreensRecord | null {
    return openScreensDal.read({ hostId: params.hostId })
  },

  persistOpenScreens(params: { hostId: string; record: OpenScreensRecord }): void {
    openScreensDal.write({ hostId: params.hostId, record: params.record })
  },
}
