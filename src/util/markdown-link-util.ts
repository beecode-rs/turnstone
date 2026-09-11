import { constant } from '#src/util/constant'
import { remotePathUtil } from '#src/util/remote-path-util'

export type MarkdownLinkTarget =
  { kind: 'empty' } | { kind: 'anchor' } | { kind: 'external'; url: string } | { kind: 'file'; path: string }

export const markdownLinkUtil = {
  resolveTarget(params: { href: string; markdownPath: string }): MarkdownLinkTarget {
    const { href, markdownPath } = params
    const trimmedHref = href.trim()
    if (trimmedHref === '') {
      return { kind: 'empty' }
    }
    if (trimmedHref.startsWith('#')) {
      return { kind: 'anchor' }
    }
    if (constant.markdownLink.schemeRegex.test(trimmedHref)) {
      return { kind: 'external', url: trimmedHref }
    }

    return {
      kind: 'file',
      path: remotePathUtil.resolveFromFile({ fromFilePath: markdownPath, targetPath: trimmedHref }),
    }
  },
}
