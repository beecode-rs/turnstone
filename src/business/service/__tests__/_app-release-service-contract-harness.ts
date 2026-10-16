import { vi } from 'vitest'

import { type AppReleaseModel } from '#src/business/model/app-release'
import { AppReleaseService } from '#src/business/service/app-release-service'
import { constant } from '#src/util/constant'

const fetchMock = vi.fn()

vi.stubGlobal('fetch', fetchMock)

export const appReleaseServiceContractHarness = {
  findLatestReleaseWhenForbiddenWithoutRateLimitHeader: async () => {
    fetchMock.mockImplementation(() => {
      return Promise.resolve(new Response('forbidden', { status: 403 }))
    })

    return await new AppReleaseService().findLatestRelease()
  },

  findLatestReleaseWhenInvalidBody: async () => {
    fetchMock.mockImplementation(() => {
      return Promise.resolve(new Response('not json', { status: 200 }))
    })

    return await new AppReleaseService().findLatestRelease()
  },

  findLatestReleaseWhenMissingReleaseFields: async () => {
    fetchMock.mockImplementation(() => {
      return Promise.resolve(new Response('{}', { status: 200 }))
    })

    return await new AppReleaseService().findLatestRelease()
  },

  findLatestReleaseWhenNetworkError: async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'))

    return await new AppReleaseService().findLatestRelease()
  },

  findLatestReleaseWhenNewerRelease: async () => {
    fetchMock.mockImplementation(() => {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            assets: [
              {
                browser_download_url:
                  'https://github.com/beecode-rs/turnstone/releases/download/v0.3.0/Turnstone-v0.3.0-android.apk',
                name: 'Turnstone-v0.3.0-android.apk',
              },
            ],
            html_url: 'https://github.com/beecode-rs/turnstone/releases/tag/v0.3.0',
            tag_name: 'v0.3.0',
          }),
          { status: 200 },
        ),
      )
    })

    return await new AppReleaseService().findLatestRelease()
  },

  findLatestReleaseWhenNoReleasePublished: async () => {
    fetchMock.mockImplementation(() => {
      return Promise.resolve(new Response('not found', { status: 404 }))
    })

    return await new AppReleaseService().findLatestRelease()
  },

  findLatestReleaseWhenRateLimited: async () => {
    fetchMock.mockImplementation(() => {
      return Promise.resolve(
        new Response('rate limit exceeded', {
          headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '4102444800' },
          status: 403,
        }),
      )
    })

    return await new AppReleaseService().findLatestRelease()
  },

  findLatestReleaseWhenServerError: async () => {
    fetchMock.mockImplementation(() => {
      return Promise.resolve(new Response('server error', { status: 500 }))
    })

    return await new AppReleaseService().findLatestRelease()
  },

  findLatestReleaseWhenTimedOut: async () => {
    vi.useFakeTimers()
    fetchMock.mockImplementation((_input: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'))
        })
      })
    })

    try {
      const resultPromise = new AppReleaseService().findLatestRelease()
      await vi.advanceTimersByTimeAsync(constant.appUpdate.requestTimeoutMs)

      return await resultPromise
    } finally {
      vi.useRealTimers()
    }
  },

  findLatestReleaseRequestObservation: async () => {
    fetchMock.mockImplementation(() => {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            html_url: 'https://github.com/beecode-rs/turnstone/releases/tag/v0.3.0',
            tag_name: 'v0.3.0',
          }),
          { status: 200 },
        ),
      )
    })
    const result = await new AppReleaseService().findLatestRelease()
    const firstCall = fetchMock.mock.calls[0]
    const requestInit = firstCall?.[1] as RequestInit | undefined
    const headers = requestInit?.headers as Record<string, string> | undefined

    return {
      hasAbortSignal: requestInit?.signal instanceof AbortSignal,
      headersAccept: headers?.Accept,
      result,
      url: firstCall?.[0],
    }
  },

  resolveStatusWhenNewerRelease: (params: { currentVersion: string; release: AppReleaseModel }) => {
    return new AppReleaseService().resolveStatus(params)
  },

  resolveStatusWhenSameRelease: (params: { currentVersion: string; release: AppReleaseModel }) => {
    return new AppReleaseService().resolveStatus(params)
  },
}
