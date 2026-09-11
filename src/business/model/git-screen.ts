import { type GitDiffFilePatch } from '#src/business/model/git-diff'
import { type GitStatusChange } from '#src/business/model/git-status'

export type GitScreenRow = {
  change: GitStatusChange
  isExpanded: boolean
  isPatchLoaded: boolean
  patch: GitDiffFilePatch | null
  rowKey: string
}
