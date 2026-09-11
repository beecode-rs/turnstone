export type HostKeyVerification =
  | { hostId: string; presentedFingerprint: string; status: 'pending' }
  | { fingerprint: string; hostId: string; status: 'trusted' }
  | { expectedFingerprint: string; hostId: string; presentedFingerprint: string; status: 'mismatch' }

export class HostKeyMismatchError extends Error {
  readonly expectedFingerprint: string
  readonly hostId: string
  readonly presentedFingerprint: string

  constructor(params: { expectedFingerprint: string; hostId: string; presentedFingerprint: string }) {
    super(
      `Host key mismatch for ${params.hostId}: expected ${params.expectedFingerprint}, presented ${params.presentedFingerprint}`,
    )
    this.name = 'HostKeyMismatchError'
    this.expectedFingerprint = params.expectedFingerprint
    this.hostId = params.hostId
    this.presentedFingerprint = params.presentedFingerprint
  }
}
