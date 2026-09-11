import { type GitDiffChangeTypeMapper } from '#src/business/enum/git-diff-change-type-mapper-enum'

export type GitDiffNumstatEntry = {
  added: number | null
  deleted: number | null
  origPath: string | null
  path: string
}

export type GitDiffChange = {
  content: string
  newLineNumber: number | null
  oldLineNumber: number | null
  type: GitDiffChangeTypeMapper
}

export type GitDiffHunk = {
  changes: GitDiffChange[]
  content: string
  newLines: number
  newStart: number
  oldLines: number
  oldStart: number
}

export type GitDiffFilePatch = {
  additions: number
  deletions: number
  from: string | null
  hunks: GitDiffHunk[]
  isEmptyFile?: boolean
  isTruncated?: boolean
  to: string | null
}

export type GitDiffWordPart = {
  isAdded: boolean
  isRemoved: boolean
  value: string
}
