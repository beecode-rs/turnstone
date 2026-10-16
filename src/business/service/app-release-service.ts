import { UpdateCheckErrorMapper } from '#src/business/enum/update-check-error-mapper-enum'
import { UpdateCheckStatusMapper } from '#src/business/enum/update-check-status-mapper-enum'
import { type AppReleaseModel } from '#src/business/model/app-release'
import { type UpdateCheckErrorModel, type UpdateCheckResult } from '#src/business/model/update-check'
import { constant } from '#src/util/constant'
import { versionCompareUtil } from '#src/util/version-compare-util'

type GithubReleaseAssetResponse = {
  browser_download_url?: string
  name?: string
}

type GithubLatestReleaseResponse = {
  assets?: GithubReleaseAssetResponse[]
  html_url?: string
  tag_name?: string
}

export class AppReleaseService {
  async findLatestRelease(): Promise<UpdateCheckResult> {
    const abortController = new AbortController()
    const abortTimeout = setTimeout(() => {
      abortController.abort()
    }, constant.appUpdate.requestTimeoutMs)

    try {
      const response = await fetch(constant.appUpdate.githubLatestReleaseUrl, {
        headers: { Accept: 'application/vnd.github+json' },
        signal: abortController.signal,
      })

      return await this._resolveResponseResult({ response })
    } catch (error) {
      return { error: this._resolveFetchFailureError({ error }), release: undefined }
    } finally {
      clearTimeout(abortTimeout)
    }
  }

  resolveStatus(params: { currentVersion: string; release: AppReleaseModel }): UpdateCheckStatusMapper {
    const { currentVersion, release } = params
    const comparison = versionCompareUtil.compare({ left: release.tagName, right: currentVersion })
    if (comparison > 0) {
      return UpdateCheckStatusMapper.UPDATE_AVAILABLE
    }

    return UpdateCheckStatusMapper.UP_TO_DATE
  }

  protected async _resolveResponseResult(params: { response: Response }): Promise<UpdateCheckResult> {
    const { response } = params

    if (!response.ok) {
      return { error: this._resolveResponseError({ response }), release: undefined }
    }

    return this._parseReleaseResult({ data: await response.json() })
  }

  protected _parseReleaseResult(params: { data: unknown }): UpdateCheckResult {
    const { data } = params
    const release = this._mapRelease({ data })

    if (release === undefined) {
      return {
        error: { cause: 'unexpected github release response shape', kind: UpdateCheckErrorMapper.INVALID_RESPONSE },
        release: undefined,
      }
    }

    return { error: undefined, release }
  }

  protected _resolveResponseError(params: { response: Response }): UpdateCheckErrorModel {
    const { response } = params

    if (this._isRateLimitResponse({ response })) {
      return {
        httpStatus: response.status,
        kind: UpdateCheckErrorMapper.RATE_LIMITED,
        rateLimitResetAt: this._resolveRateLimitResetAt({ response }),
      }
    }

    return { httpStatus: response.status, kind: UpdateCheckErrorMapper.HTTP_ERROR }
  }

  protected _resolveFetchFailureError(params: { error: unknown }): UpdateCheckErrorModel {
    const { error } = params

    if (!(error instanceof Error)) {
      return { cause: String(error), kind: UpdateCheckErrorMapper.NETWORK }
    }

    switch (error.name) {
      case 'AbortError': {
        return { cause: error.message, kind: UpdateCheckErrorMapper.TIMEOUT }
      }
      case 'SyntaxError': {
        return { cause: 'release body is not valid json', kind: UpdateCheckErrorMapper.INVALID_RESPONSE }
      }
      default: {
        return { cause: error.message, kind: UpdateCheckErrorMapper.NETWORK }
      }
    }
  }

  protected _isRateLimitResponse(params: { response: Response }): boolean {
    const { response } = params

    if (response.status !== 403) {
      return false
    }

    return response.headers.get('x-ratelimit-remaining') === '0'
  }

  protected _resolveRateLimitResetAt(params: { response: Response }): number | undefined {
    const { response } = params
    const resetHeader = response.headers.get('x-ratelimit-reset')
    const resetSeconds = Number(resetHeader)

    if (resetHeader === null || Number.isNaN(resetSeconds)) {
      return undefined
    }

    return resetSeconds * 1000
  }

  protected _mapRelease(params: { data: unknown }): AppReleaseModel | undefined {
    const { data } = params
    const releaseData = data as GithubLatestReleaseResponse | undefined
    if (releaseData?.tag_name === undefined || releaseData.html_url === undefined) {
      return undefined
    }

    return {
      androidApkDownloadUrl: this._pickAndroidApkDownloadUrl({ assets: releaseData.assets ?? [] }),
      htmlUrl: releaseData.html_url,
      tagName: releaseData.tag_name,
    }
  }

  protected _pickAndroidApkDownloadUrl(params: { assets: GithubReleaseAssetResponse[] }): string | null {
    const { assets } = params
    const apkDownloadUrls = assets
      .filter((asset) => {
        return constant.appUpdate.apkAssetNameRegex.test(asset.name ?? '')
      })
      .map((asset) => {
        return {
          browserDownloadUrl: asset.browser_download_url,
          isAndroid: constant.appUpdate.androidAssetNameRegex.test(asset.name ?? ''),
        }
      })
    const androidApkAsset = apkDownloadUrls.find((asset) => {
      return asset.isAndroid
    })
    const selectedApkAsset = androidApkAsset ?? apkDownloadUrls[0]
    if (selectedApkAsset === undefined || selectedApkAsset.browserDownloadUrl === undefined) {
      return null
    }

    return selectedApkAsset.browserDownloadUrl
  }
}
