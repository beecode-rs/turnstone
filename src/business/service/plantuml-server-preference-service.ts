import {
  type PlantumlServerPreference,
  type PlantumlServerPreferenceStorage,
} from '#src/business/model/plantuml-server-preference'
import { constant } from '#src/util/constant'

export class PlantumlServerPreferenceService {
  parsePreference(params: { value: string | null }): PlantumlServerPreference {
    const { value } = params
    const parsedValue = this._parseJsonValue({ value })
    if (!this._isPreference(parsedValue)) {
      return constant.plantumlServer.defaultPreference
    }

    return {
      customServerUrl: this._sanitizeServerUrl({ serverUrl: parsedValue.customServerUrl }),
      isCustomServerEnabled: parsedValue.isCustomServerEnabled,
      isSelfSignedCertificateIgnored: this._parseIsSelfSignedCertificateIgnored({ value: parsedValue }),
    }
  }

  serializePreference(params: { preference: PlantumlServerPreference }): string {
    const { preference } = params

    return JSON.stringify(preference)
  }

  async loadPreference(params: { storage: PlantumlServerPreferenceStorage }): Promise<PlantumlServerPreference> {
    const { storage } = params
    const storedValue = await storage.readPreference()

    return this.parsePreference({ value: storedValue })
  }

  async savePreference(params: {
    preference: PlantumlServerPreference
    storage: PlantumlServerPreferenceStorage
  }): Promise<void> {
    const { preference, storage } = params
    await storage.writePreference({ value: this.serializePreference({ preference }) })
  }

  protected _parseJsonValue(params: { value: string | null }): unknown {
    const { value } = params
    if (value === null) {
      return null
    }
    try {
      return JSON.parse(value) as unknown
    } catch {
      return null
    }
  }

  protected _isPreference(value: unknown): value is PlantumlServerPreference {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false
    }
    const candidate = value as {
      customServerUrl?: unknown
      isCustomServerEnabled?: unknown
      isSelfSignedCertificateIgnored?: unknown
    }

    return typeof candidate.customServerUrl === 'string' && typeof candidate.isCustomServerEnabled === 'boolean'
  }

  protected _parseIsSelfSignedCertificateIgnored(params: { value: PlantumlServerPreference }): boolean {
    const { value } = params
    const legacyCandidate = value as { isSelfSignedCertificateIgnored?: unknown }

    return legacyCandidate.isSelfSignedCertificateIgnored === true
  }

  protected _sanitizeServerUrl(params: { serverUrl: string }): string {
    const { serverUrl } = params
    const trimmedServerUrl = serverUrl.trim()
    if (trimmedServerUrl === '' || !constant.plantumlServer.urlRegex.test(trimmedServerUrl)) {
      return constant.plantuml.defaultServerUrl
    }

    return trimmedServerUrl
  }
}
