// Covers: DeviceKeyService orchestration (find/getOrCreate/regenerate/rename/remove) against a
// constructor-injected in-memory DeviceKeyStore with faked react-native/expo modules.
// contract.yaml cannot express constructor-injected dependencies or vi.mock module fakes,
// so this Vitest file supplements the declarative contracts for the pure logic
// (device-key-name-util.contract.yaml, authorized-key-install-service.contract.yaml).

import { afterEach, describe, expect, it, vi } from 'vitest'

import { type DeviceKeyInfo, type DeviceKeyStore } from '#src/business/model/device-key'
import { DeviceKeyService } from '#src/business/service/device-key-service'

const mockDeviceEnv = vi.hoisted(() => {
  return {
    appName: 'Turnstone',
    deviceName: "Milos's Phone",
    modelName: 'Pixel 8',
  } as { appName: string; deviceName: string | null; modelName: string | null }
})

vi.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      get name() {
        return mockDeviceEnv.appName
      },
      slug: 'turnstone',
    },
  },
}))

vi.mock('expo-device', () => ({
  get deviceName() {
    return mockDeviceEnv.deviceName
  },
  get modelName() {
    return mockDeviceEnv.modelName
  },
}))

vi.mock('react-native', () => ({
  Platform: { OS: 'android' },
}))

const EXPECTED_COMMENT = 'turnstone-beecode@miloss-phone-android'

class InMemoryDeviceKeyDal implements DeviceKeyStore {
  isSaveFailing = false
  saveCalls = 0
  savedKeyInfo: DeviceKeyInfo | null = null

  async find(): Promise<DeviceKeyInfo | null> {
    return this.savedKeyInfo
  }

  async remove(): Promise<void> {
    this.savedKeyInfo = null
  }

  async save(params: { keyInfo: DeviceKeyInfo }): Promise<void> {
    this.saveCalls += 1
    if (this.isSaveFailing) {
      throw new Error('keychain write failed')
    }
    this.savedKeyInfo = params.keyInfo
  }
}

describe('DeviceKeyService', () => {
  afterEach(() => {
    mockDeviceEnv.appName = 'Turnstone'
    mockDeviceEnv.deviceName = "Milos's Phone"
    mockDeviceEnv.modelName = 'Pixel 8'
  })

  it('finds nothing when the store is empty', async () => {
    const service = new DeviceKeyService({ deviceKeyDal: new InMemoryDeviceKeyDal() })

    expect(await service.find()).toBeNull()
  })

  it('finds the stored key without saving', async () => {
    const dal = new InMemoryDeviceKeyDal()
    dal.savedKeyInfo = {
      comment: EXPECTED_COMMENT,
      createdAt: '2026-09-28T10:00:00.000Z',
      fingerprint: 'SHA256:existing',
      privateKey: '-----BEGIN OPENSSH PRIVATE KEY-----',
      publicKey: `ssh-ed25519 AAAAexisting ${EXPECTED_COMMENT}`,
    }
    const service = new DeviceKeyService({ deviceKeyDal: dal })

    expect(await service.find()).toBe(dal.savedKeyInfo)
    expect(dal.saveCalls).toBe(0)
  })

  it('generates a key with the beecode comment format and OpenSSH material', async () => {
    const dal = new InMemoryDeviceKeyDal()
    const service = new DeviceKeyService({ deviceKeyDal: dal })

    const keyInfo = await service.regenerate()

    expect(keyInfo.comment).toBe(EXPECTED_COMMENT)
    expect(keyInfo.publicKey).toMatch(/^ssh-ed25519 [A-Za-z0-9+/=]+ turnstone-beecode@miloss-phone-android$/)
    expect(keyInfo.fingerprint).toMatch(/^SHA256:[A-Za-z0-9+/]+={0,2}$/)
    expect(keyInfo.privateKey).toContain('BEGIN OPENSSH PRIVATE KEY')
    expect(dal.savedKeyInfo).toBe(keyInfo)
  })

  it('regenerates different key material with a stable comment', async () => {
    const dal = new InMemoryDeviceKeyDal()
    const service = new DeviceKeyService({ deviceKeyDal: dal })

    const first = await service.regenerate()
    const second = await service.regenerate()

    expect(second.comment).toBe(first.comment)
    expect(second.publicKey).not.toBe(first.publicKey)
    expect(second.fingerprint).not.toBe(first.fingerprint)
  })

  it('falls back to slug, model name, and defaults when names are missing', async () => {
    mockDeviceEnv.appName = ''
    mockDeviceEnv.deviceName = null
    mockDeviceEnv.modelName = null
    const service = new DeviceKeyService({ deviceKeyDal: new InMemoryDeviceKeyDal() })

    const keyInfo = await service.regenerate()

    expect(keyInfo.comment).toBe('turnstone-beecode@device-android')
  })

  it('renames by rebuilding the public key comment while preserving key material', async () => {
    const dal = new InMemoryDeviceKeyDal()
    const service = new DeviceKeyService({ deviceKeyDal: dal })
    const existing = await service.regenerate()
    const keyBlob = existing.publicKey.split(' ')[1] ?? ''

    const renamed = await service.rename({ comment: '  Custom Name ' })

    expect(renamed?.comment).toBe('Custom Name')
    expect(renamed?.publicKey).toBe(`ssh-ed25519 ${keyBlob} Custom Name`)
    expect(renamed?.fingerprint).toBe(existing.fingerprint)
    expect(renamed?.privateKey).toBe(existing.privateKey)
    expect(dal.savedKeyInfo?.comment).toBe('Custom Name')
  })

  it('treats a blank rename as a no-op', async () => {
    const dal = new InMemoryDeviceKeyDal()
    const service = new DeviceKeyService({ deviceKeyDal: dal })
    const existing = await service.regenerate()
    dal.saveCalls = 0

    const renamed = await service.rename({ comment: '   ' })

    expect(renamed).toBe(existing)
    expect(dal.saveCalls).toBe(0)
  })

  it('returns null when renaming with no stored key', async () => {
    const service = new DeviceKeyService({ deviceKeyDal: new InMemoryDeviceKeyDal() })

    expect(await service.rename({ comment: 'name' })).toBeNull()
  })

  it('removes the stored key', async () => {
    const dal = new InMemoryDeviceKeyDal()
    const service = new DeviceKeyService({ deviceKeyDal: dal })
    await service.regenerate()

    await service.remove()

    expect(dal.savedKeyInfo).toBeNull()
  })

  it('creates once and returns the stored key on later getOrCreate calls', async () => {
    const dal = new InMemoryDeviceKeyDal()
    const service = new DeviceKeyService({ deviceKeyDal: dal })

    const first = await service.getOrCreate()
    const second = await service.getOrCreate()

    expect(dal.saveCalls).toBe(1)
    expect(second).toBe(first)
  })

  it('shares a single generation across concurrent getOrCreate calls', async () => {
    const dal = new InMemoryDeviceKeyDal()
    const service = new DeviceKeyService({ deviceKeyDal: dal })

    const [first, second] = await Promise.all([service.getOrCreate(), service.getOrCreate()])

    expect(dal.saveCalls).toBe(1)
    expect(second).toBe(first)
  })

  it('retries generation after a failed save', async () => {
    const dal = new InMemoryDeviceKeyDal()
    dal.isSaveFailing = true
    const service = new DeviceKeyService({ deviceKeyDal: dal })

    await expect(service.getOrCreate()).rejects.toThrow('keychain write failed')
    dal.isSaveFailing = false
    const keyInfo = await service.getOrCreate()

    expect(keyInfo.comment).toBe(EXPECTED_COMMENT)
    expect(dal.savedKeyInfo).toBe(keyInfo)
  })
})
