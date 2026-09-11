import { GitStatusChangeTypeMapper } from '#src/business/enum/git-status-change-type-mapper-enum'

export type GitStatusParseChange = {
  indexStatus: string | null
  origPath: string | null
  path: string
  type: GitStatusChangeTypeMapper
  worktreeStatus: string | null
}

export type GitStatusParseBranch = {
  ahead: number
  behind: number
  head: string | null
  oid: string | null
  upstream: string | null
}

export type GitStatusParseResult = {
  branch: GitStatusParseBranch | null
  changes: GitStatusParseChange[]
}

const gitStatusParseUtil = {
  _applyBranchLine(params: { line: string; state: GitStatusParseBranch }): GitStatusParseBranch {
    const { line, state } = params
    const tokens = line.split(' ')
    switch (tokens.at(1)) {
      case 'branch.ab': {
        return {
          ...state,
          ahead: gitStatusParseUtil._toCount({ token: tokens.at(2) ?? '' }),
          behind: gitStatusParseUtil._toCount({ token: tokens.at(3) ?? '' }),
        }
      }
      case 'branch.head': {
        return { ...state, head: gitStatusParseUtil._toValue({ tokens }) }
      }
      case 'branch.oid': {
        return { ...state, oid: gitStatusParseUtil._toValue({ tokens }) }
      }
      case 'branch.upstream': {
        return { ...state, upstream: gitStatusParseUtil._toValue({ tokens }) }
      }
      default: {
        return state
      }
    }
  },
  _parseChangeLine(params: { line: string }): GitStatusParseChange | null {
    const { line } = params
    const fields = line.split(' ')
    switch (fields.at(0)) {
      case '!': {
        return gitStatusParseUtil._toPathOnlyChange({ fields, type: GitStatusChangeTypeMapper.IGNORED })
      }
      case '1': {
        return gitStatusParseUtil._toOrdinaryChange({ fields })
      }
      case '2': {
        return gitStatusParseUtil._toRenameChange({ fields })
      }
      case '?': {
        return gitStatusParseUtil._toPathOnlyChange({ fields, type: GitStatusChangeTypeMapper.UNTRACKED })
      }
      case 'u': {
        return gitStatusParseUtil._toUnmergedChange({ fields })
      }
      default: {
        return null
      }
    }
  },
  _toBranchOrNull(params: { lines: string[] }): GitStatusParseBranch | null {
    const { lines } = params
    if (lines.length === 0) {
      return null
    }

    return lines.reduce(
      (state: GitStatusParseBranch, line: string) => {
        return gitStatusParseUtil._applyBranchLine({ line, state })
      },
      { ahead: 0, behind: 0, head: null, oid: null, upstream: null },
    )
  },
  _toCount(params: { token: string }): number {
    const { token } = params
    const parsed = Number.parseInt(token.slice(1), 10)
    if (Number.isNaN(parsed)) {
      return 0
    }

    return parsed
  },
  _toOrdinaryChange(params: { fields: string[] }): GitStatusParseChange {
    const { fields } = params

    return {
      indexStatus: fields.at(1)?.charAt(0) ?? null,
      origPath: null,
      path: fields.slice(8).join(' '),
      type: GitStatusChangeTypeMapper.CHANGED,
      worktreeStatus: fields.at(1)?.charAt(1) ?? null,
    }
  },
  _toPathOnlyChange(params: {
    fields: string[]
    type: GitStatusChangeTypeMapper.IGNORED | GitStatusChangeTypeMapper.UNTRACKED
  }): GitStatusParseChange {
    const { fields, type } = params

    return {
      indexStatus: null,
      origPath: null,
      path: fields.slice(1).join(' '),
      type,
      worktreeStatus: null,
    }
  },
  _toRenameChange(params: { fields: string[] }): GitStatusParseChange {
    const { fields } = params
    const pathParts = fields.slice(9).join(' ').split('\t')

    return {
      indexStatus: fields.at(1)?.charAt(0) ?? null,
      origPath: pathParts.at(1) ?? null,
      path: pathParts.at(0) ?? '',
      type: GitStatusChangeTypeMapper.RENAMED,
      worktreeStatus: fields.at(1)?.charAt(1) ?? null,
    }
  },
  _toUnmergedChange(params: { fields: string[] }): GitStatusParseChange {
    const { fields } = params

    return {
      indexStatus: fields.at(1)?.charAt(0) ?? null,
      origPath: null,
      path: fields.slice(10).join(' '),
      type: GitStatusChangeTypeMapper.UNMERGED,
      worktreeStatus: fields.at(1)?.charAt(1) ?? null,
    }
  },
  _toValue(params: { tokens: string[] }): string {
    const { tokens } = params

    return tokens.slice(2).join(' ')
  },
  parseStatusLines(params: { lines: string[] }): GitStatusParseResult {
    const { lines } = params
    const meaningfulLines = lines.filter((line: string) => {
      return line.trim() !== ''
    })

    return {
      branch: gitStatusParseUtil._toBranchOrNull({
        lines: meaningfulLines.filter((line: string) => {
          return line.startsWith('# branch.')
        }),
      }),
      changes: meaningfulLines
        .filter((line: string) => {
          return !line.startsWith('#')
        })
        .map((line: string): GitStatusParseChange | null => {
          return gitStatusParseUtil._parseChangeLine({ line })
        })
        .filter((change: GitStatusParseChange | null): change is GitStatusParseChange => {
          return change !== null
        }),
    }
  },
}

export { gitStatusParseUtil }
