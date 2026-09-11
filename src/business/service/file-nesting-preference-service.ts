import {
  type FileNestingPattern,
  type FileNestingPreference,
  type FileNestingPreferenceStorage,
} from '#src/business/model/file-nesting-preference'
import { constant } from '#src/util/constant'

export class FileNestingPreferenceService {
  parsePreference(params: { value: string | null }): FileNestingPreference {
    const { value } = params
    const parsedValue = this._parseJsonValue({ value })
    if (!this._isPreference(parsedValue)) {
      return constant.fileNesting.defaultPreference
    }

    return parsedValue
  }

  serializePreference(params: { preference: FileNestingPreference }): string {
    const { preference } = params

    return JSON.stringify(preference)
  }

  async loadPreference(params: { storage: FileNestingPreferenceStorage }): Promise<FileNestingPreference> {
    const { storage } = params
    const storedValue = await storage.readPreference()

    return this.parsePreference({ value: storedValue })
  }

  async savePreference(params: {
    preference: FileNestingPreference
    storage: FileNestingPreferenceStorage
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

  protected _isPreference(value: unknown): value is FileNestingPreference {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false
    }
    const candidate = value as { isEnabled?: unknown; patterns?: unknown }
    if (typeof candidate.isEnabled !== 'boolean' || !Array.isArray(candidate.patterns)) {
      return false
    }

    return candidate.patterns.every((pattern) => {
      return this._isPattern(pattern)
    })
  }

  protected _isPattern(value: unknown): value is FileNestingPattern {
    if (typeof value !== 'object' || value === null) {
      return false
    }
    const candidate = value as { children?: unknown; parent?: unknown }
    if (typeof candidate.parent !== 'string' || candidate.parent.length === 0 || !Array.isArray(candidate.children)) {
      return false
    }

    return candidate.children.every((child) => {
      return typeof child === 'string' && child.length > 0
    })
  }
}
