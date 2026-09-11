import { constant } from '#src/util/constant'

export const backoffUtil = {
  delayMs(params: { attempt: number }): number {
    const { attempt } = params
    const safeAttempt = Math.max(attempt, 0)
    const rawDelayMs = constant.backoff.delayMs.initial * 2 ** safeAttempt

    return Math.min(rawDelayMs, constant.backoff.delayMs.max)
  },
}
