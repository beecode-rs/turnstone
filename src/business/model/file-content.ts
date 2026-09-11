import { type FileBomMapper } from '#src/business/enum/file-bom-mapper-enum'
import { type FileEncodingMapper } from '#src/business/enum/file-encoding-mapper-enum'

export type FileBomKind = FileBomMapper | null

export type BinaryFileContent = {
  isBinary: true
  size: number
}

export type TextFileContent = {
  encoding: FileEncodingMapper
  hasMore: boolean
  isBinary: false
  isCapReached: boolean
  loadedBytes: number
  size: number
  text: string
}

export type FileContent = BinaryFileContent | TextFileContent

export type FileReadState = {
  encoding: FileEncodingMapper
  offset: number
  path: string
  pendingBytes: number[]
  size: number
}

export type FileOpenResult = {
  content: FileContent
  state: FileReadState | null
}

export class FileCapReachedError extends Error {
  constructor() {
    super('File on-demand read cap reached')
    this.name = 'FileCapReachedError'
  }
}
