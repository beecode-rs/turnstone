import { type ViewerThemeMapper } from '#src/business/enum/viewer-theme-mapper-enum'

export type MermaidViewerRenderMessage = {
  source: string
  theme: ViewerThemeMapper
  type: 'render'
}

export type MermaidViewerMessageIn = MermaidViewerRenderMessage

export type MermaidViewerContentHeightMessage = {
  height: number
  type: 'content-height'
}

export type MermaidViewerErrorMessage = {
  message: string
  type: 'error'
}

export type MermaidViewerMessageOut = MermaidViewerContentHeightMessage | MermaidViewerErrorMessage
