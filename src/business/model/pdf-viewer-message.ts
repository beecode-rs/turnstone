import { type ViewerThemeMapper } from '#src/business/enum/viewer-theme-mapper-enum'

export type PdfViewerLoadBeginMessage = {
  byteLength: number
  type: 'load-begin'
}

export type PdfViewerLoadChunkMessage = {
  base64: string
  type: 'load-chunk'
}

export type PdfViewerLoadEndMessage = {
  type: 'load-end'
}

export type PdfViewerSetThemeMessage = {
  theme: ViewerThemeMapper
  type: 'set-theme'
}

export type PdfViewerMessageIn =
  PdfViewerLoadBeginMessage | PdfViewerLoadChunkMessage | PdfViewerLoadEndMessage | PdfViewerSetThemeMessage

export type PdfViewerContentHeightMessage = {
  height: number
  type: 'content-height'
}

export type PdfViewerDocumentMetaMessage = {
  pageCount: number
  type: 'document-meta'
}

export type PdfViewerErrorMessage = {
  message: string
  type: 'error'
}

export type PdfViewerMessageOut = PdfViewerContentHeightMessage | PdfViewerDocumentMetaMessage | PdfViewerErrorMessage
