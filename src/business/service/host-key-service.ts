import { type Buffer } from 'buffer'

import { HostKeyMismatchError, type HostKeyVerification } from '#src/business/model/host-key'
import { type SshHostKeyVerifier } from '#src/business/model/ssh-transport'
import { type KnownHostDal } from '#src/dal/secure-store/known-host-dal'
import { fingerprintUtil } from '#src/util/fingerprint-util'

type PendingHostKeyDecision = {
  hostId: string
  hostKeyBase64: string
  presentedFingerprint: string
  resolve: (isAccepted: boolean) => void
}

export class HostKeyService {
  protected readonly _knownHostDal: KnownHostDal
  protected readonly _listeners: Set<(verification: HostKeyVerification) => void>
  protected readonly _mismatchErrors: Map<string, HostKeyMismatchError>
  protected readonly _pendingDecisions: Map<string, PendingHostKeyDecision>
  protected readonly _verifications: Map<string, HostKeyVerification>

  constructor(params: { knownHostDal: KnownHostDal }) {
    this._knownHostDal = params.knownHostDal
    this._listeners = new Set()
    this._mismatchErrors = new Map()
    this._pendingDecisions = new Map()
    this._verifications = new Map()
  }

  createVerifier(params: { hostId: string }): SshHostKeyVerifier {
    const { hostId } = params
    const verifyPresentedKey = (key: Buffer, verify: (isValid: boolean) => void): void => {
      void this._verifyPresentedKey({ hostId, key })
        .then((isTrusted: boolean) => {
          verify(isTrusted)
        })
        .catch(() => {
          verify(false)
        })
    }

    return verifyPresentedKey
  }

  getVerification(params: { hostId: string }): HostKeyVerification | null {
    const { hostId } = params

    return this._verifications.get(hostId) ?? null
  }

  subscribeToVerification(callback: (verification: HostKeyVerification) => void): () => void {
    this._listeners.add(callback)

    return () => {
      this._listeners.delete(callback)
    }
  }

  async acceptPendingHostKey(params: { hostId: string }): Promise<void> {
    const { hostId } = params
    const decision = this._pendingDecisions.get(hostId)
    if (!decision) {
      return
    }
    this._pendingDecisions.delete(hostId)
    await this._knownHostDal.save({
      hostId,
      knownHost: {
        fingerprint: decision.presentedFingerprint,
        hostKeyBase64: decision.hostKeyBase64,
      },
    })
    this._setVerification({
      verification: {
        fingerprint: decision.presentedFingerprint,
        hostId,
        status: 'trusted',
      },
    })
    decision.resolve(true)
  }

  rejectPendingHostKey(params: { hostId: string }): void {
    const { hostId } = params
    const decision = this._pendingDecisions.get(hostId)
    if (!decision) {
      return
    }
    this._pendingDecisions.delete(hostId)
    this._verifications.delete(hostId)
    decision.resolve(false)
  }

  async removeStoredHostKey(params: { hostId: string }): Promise<void> {
    const { hostId } = params
    await this._knownHostDal.remove({ hostId })
    this._mismatchErrors.delete(hostId)
    this._verifications.delete(hostId)
  }

  takeMismatchError(params: { hostId: string }): HostKeyMismatchError | null {
    const { hostId } = params
    const mismatchError = this._mismatchErrors.get(hostId)
    this._mismatchErrors.delete(hostId)

    return mismatchError ?? null
  }

  protected async _verifyPresentedKey(params: { hostId: string; key: Buffer }): Promise<boolean> {
    const { hostId, key } = params
    const presentedFingerprint = fingerprintUtil.sha256Fingerprint({ hostKey: key })
    const storedKnownHost = await this._knownHostDal.find({ hostId })
    if (!storedKnownHost) {
      return this._awaitHostKeyAcceptance({
        hostId,
        hostKeyBase64: key.toString('base64'),
        presentedFingerprint,
      })
    }
    if (storedKnownHost.fingerprint === presentedFingerprint) {
      this._setVerification({
        verification: {
          fingerprint: presentedFingerprint,
          hostId,
          status: 'trusted',
        },
      })

      return true
    }
    throw this._createMismatchError({
      expectedFingerprint: storedKnownHost.fingerprint,
      hostId,
      presentedFingerprint,
    })
  }

  protected _awaitHostKeyAcceptance(params: {
    hostId: string
    hostKeyBase64: string
    presentedFingerprint: string
  }): Promise<boolean> {
    const { hostId, hostKeyBase64, presentedFingerprint } = params
    this._setVerification({
      verification: {
        hostId,
        presentedFingerprint,
        status: 'pending',
      },
    })

    return new Promise<boolean>((resolve) => {
      this._pendingDecisions.set(hostId, {
        hostId,
        hostKeyBase64,
        presentedFingerprint,
        resolve,
      })
    })
  }

  protected _createMismatchError(params: {
    expectedFingerprint: string
    hostId: string
    presentedFingerprint: string
  }): HostKeyMismatchError {
    const { expectedFingerprint, hostId, presentedFingerprint } = params
    const mismatchError = new HostKeyMismatchError({
      expectedFingerprint,
      hostId,
      presentedFingerprint,
    })
    this._mismatchErrors.set(hostId, mismatchError)
    this._setVerification({
      verification: {
        expectedFingerprint,
        hostId,
        presentedFingerprint,
        status: 'mismatch',
      },
    })

    return mismatchError
  }

  protected _setVerification(params: { verification: HostKeyVerification }): void {
    const { verification } = params
    this._verifications.set(verification.hostId, verification)
    this._listeners.forEach((listener) => {
      listener(verification)
    })
  }
}
