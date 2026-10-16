import { type UpdateCheckErrorMapper } from '#src/business/enum/update-check-error-mapper-enum'
import { type AppReleaseModel } from '#src/business/model/app-release'

export type UpdateCheckErrorModel = {
  cause?: string
  httpStatus?: number
  kind: UpdateCheckErrorMapper
  rateLimitResetAt?: number
}

export type UpdateCheckResult =
  { error: UpdateCheckErrorModel; release: undefined } | { error: undefined; release: AppReleaseModel }
