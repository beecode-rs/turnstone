import { type ViewerThemeMapper } from '#src/business/enum/viewer-theme-mapper-enum'

export type ViewerInjectContentMessage = {
  content: string
  language: string
  type: 'inject-content'
}

export type ViewerInjectChunkMessage = {
  text: string
  type: 'inject-chunk'
}

export type ViewerSetThemeMessage = {
  theme: ViewerThemeMapper
  type: 'set-theme'
}

export type ViewerSetFontSizeMessage = {
  fontSizePx: number
  lineHeightPx: number
  type: 'set-font-size'
}

export type ViewerSetLineNumbersMessage = {
  isLineNumbersHidden: boolean
  type: 'set-line-numbers'
}

export type ViewerSetMarginMessage = {
  paddingHorizontal: number
  paddingVertical: number
  type: 'set-margin'
}

export type ViewerSetWordWrapMessage = {
  type: 'set-word-wrap'
  wordWrap: boolean
}

export type ViewerMessageIn =
  | ViewerInjectChunkMessage
  | ViewerInjectContentMessage
  | ViewerSetFontSizeMessage
  | ViewerSetLineNumbersMessage
  | ViewerSetMarginMessage
  | ViewerSetThemeMessage
  | ViewerSetWordWrapMessage

export type ViewerContentHeightMessage = {
  height: number
  type: 'content-height'
}

export type ViewerScrollPositionMessage = {
  scrollLeft: number
  scrollWidth: number
  type: 'scroll-position'
  viewportWidth: number
}

export type ViewerPullDownMessage = {
  type: 'pull-down'
}

export type ViewerMessageOut = ViewerContentHeightMessage | ViewerPullDownMessage | ViewerScrollPositionMessage
