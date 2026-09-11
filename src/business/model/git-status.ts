import { type GitStatusChangeTypeMapper } from '#src/business/enum/git-status-change-type-mapper-enum'

export type GitStatusChange = {
  indexStatus: string | null
  origPath: string | null
  path: string
  type: GitStatusChangeTypeMapper
  worktreeStatus: string | null
}

export type GitStatusBranch = {
  ahead: number
  behind: number
  head: string | null
  oid: string | null
  upstream: string | null
}

export type GitStatus = {
  branch: GitStatusBranch | null
  changes: GitStatusChange[]
}
