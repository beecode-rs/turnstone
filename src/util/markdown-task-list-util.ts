import { type ASTNode, type MarkdownIt } from '@ronradtke/react-native-markdown-display'

import { constant } from '#src/util/constant'

interface MarkdownTaskToken {
  attrs: [string, string][] | null
  children: MarkdownTaskToken[] | null
  content: string
  nesting: number
  type: string
}

interface DirectInlineScanState {
  depth: number
  inlineToken: MarkdownTaskToken | null
  isBlocked: boolean
}

export const markdownTaskListUtil = {
  _resolveDirectInlineToken(params: { tokens: MarkdownTaskToken[]; startIndex: number }): MarkdownTaskToken | null {
    const { startIndex, tokens } = params
    const scanState = tokens.slice(startIndex).reduce<DirectInlineScanState>(
      (acc, token) => {
        if (acc.inlineToken !== null || acc.isBlocked) {
          return acc
        }
        const depth = acc.depth + token.nesting
        if (token.type === 'list_item_close' && depth === 0) {
          return { depth, inlineToken: null, isBlocked: true }
        }
        if (token.type === 'inline' && depth === 1) {
          return { depth, inlineToken: token, isBlocked: false }
        }
        if (token.nesting === 1 && token.type !== 'paragraph_open') {
          return { depth, inlineToken: null, isBlocked: true }
        }

        return { depth, inlineToken: null, isBlocked: false }
      },
      { depth: 0, inlineToken: null, isBlocked: false },
    )

    return scanState.inlineToken
  },
  _stripTaskMarker(params: { inlineToken: MarkdownTaskToken }): boolean | null {
    const { inlineToken } = params
    const firstChild = inlineToken.children?.[0]
    if (firstChild?.type !== 'text') {
      return null
    }
    const markerMatch = constant.markdownTaskList.markerRegex.exec(firstChild.content)
    if (markerMatch === null) {
      return null
    }
    firstChild.content = firstChild.content.slice(markerMatch[0].length)
    if (markerMatch[1] === ' ') {
      return false
    }

    return true
  },
  applyTaskMarkers(params: { tokens: MarkdownTaskToken[] }): MarkdownTaskToken[] {
    const { tokens } = params
    tokens.forEach((token, tokenIndex) => {
      if (token.type !== 'list_item_open') {
        return
      }
      const inlineToken = markdownTaskListUtil._resolveDirectInlineToken({
        startIndex: tokenIndex + 1,
        tokens,
      })
      if (inlineToken === null) {
        return
      }
      const isChecked = markdownTaskListUtil._stripTaskMarker({ inlineToken })
      if (isChecked === null) {
        return
      }
      token.attrs = [...(token.attrs ?? []), [constant.markdownTaskList.checkedAttribute, String(isChecked)]]
    })

    return tokens
  },
  plugin: (markdownIt: MarkdownIt): void => {
    markdownIt.core.ruler.after(
      'text_join',
      constant.markdownTaskList.listCoreRuleName,
      (state: { tokens: MarkdownTaskToken[] }) => {
        markdownTaskListUtil.applyTaskMarkers({ tokens: state.tokens })
      },
    )
  },
  resolveTaskState(params: { node: ASTNode }): boolean | null {
    const { node } = params
    const checkedAttribute = node.attributes[constant.markdownTaskList.checkedAttribute]
    if (checkedAttribute === 'true') {
      return true
    }
    if (checkedAttribute === 'false') {
      return false
    }

    return null
  },
}
