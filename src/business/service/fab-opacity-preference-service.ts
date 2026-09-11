import { type FabOpacityPreference, type FabOpacityPreferenceStorage } from '#src/business/model/fab-opacity-preference'
import { constant } from '#src/util/constant'

export class FabOpacityPreferenceService {
  parsePreference(params: { value: string | null }): FabOpacityPreference {
    const { value } = params
    if (value === null) {
      return constant.fabOpacity.percent.default
    }

    const parsedPercent = Number(value)

    if (!Number.isFinite(parsedPercent)) {
      return constant.fabOpacity.percent.default
    }

    return this._clampPercent({ percent: parsedPercent })
  }

  async loadPreference(params: { storage: FabOpacityPreferenceStorage }): Promise<FabOpacityPreference> {
    const { storage } = params
    const storedValue = await storage.readPreference()

    return this.parsePreference({ value: storedValue })
  }

  async savePreference(params: {
    opacityPercent: FabOpacityPreference
    storage: FabOpacityPreferenceStorage
  }): Promise<void> {
    const { opacityPercent, storage } = params
    await storage.writePreference({ value: String(opacityPercent) })
  }

  protected _clampPercent(params: { percent: number }): number {
    const { percent } = params

    return Math.min(Math.max(percent, constant.fabOpacity.percent.min), constant.fabOpacity.percent.max)
  }
}
