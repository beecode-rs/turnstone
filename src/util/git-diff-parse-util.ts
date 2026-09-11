import { type Change, diffLines, diffWords } from 'diff'
import parseDiff from 'parse-diff'

import { GitDiffChangeTypeMapper } from '#src/business/enum/git-diff-change-type-mapper-enum'
import { constant } from '#src/util/constant'

export type GitDiffParseNumstatEntry = {
  added: number | null
  deleted: number | null
  origPath: string | null
  path: string
}

export type GitDiffParseLineChange = {
  content: string
  newLineNumber: number | null
  oldLineNumber: number | null
  type: GitDiffChangeTypeMapper
}

export type GitDiffParseHunk = {
  changes: GitDiffParseLineChange[]
  content: string
  newLines: number
  newStart: number
  oldLines: number
  oldStart: number
}

export type GitDiffParseFilePatch = {
  additions: number
  deletions: number
  from: string | null
  hunks: GitDiffParseHunk[]
  isEmptyFile?: boolean
  isTruncated?: boolean
  to: string | null
}

export type GitDiffParseWordPart = {
  isAdded: boolean
  isRemoved: boolean
  value: string
}

type NumstatWalkState = {
  entries: GitDiffParseNumstatEntry[]
  renameEntry: GitDiffParseNumstatEntry | null
}

const gitDiffParseUtil = {
  _applyNumstatChunk(params: { chunk: string; state: NumstatWalkState }): NumstatWalkState {
    const { chunk, state } = params
    const match = constant.gitDiff.numstatRecordRegex.exec(chunk)
    if (match === null) {
      return gitDiffParseUtil._attachRenamePath({ chunk, state })
    }

    const entry: GitDiffParseNumstatEntry = {
      added: gitDiffParseUtil._toStatCount({ token: match[1] }),
      deleted: gitDiffParseUtil._toStatCount({ token: match[2] }),
      origPath: null,
      path: match[3],
    }
    state.entries.push(entry)
    if (entry.path === '') {
      return { entries: state.entries, renameEntry: entry }
    }

    return { entries: state.entries, renameEntry: null }
  },
  _attachRenamePath(params: { chunk: string; state: NumstatWalkState }): NumstatWalkState {
    const { chunk, state } = params
    const renameEntry = state.renameEntry
    if (renameEntry === null) {
      return state
    }
    if (renameEntry.origPath === null) {
      renameEntry.origPath = chunk

      return { entries: state.entries, renameEntry }
    }

    renameEntry.path = chunk

    return { entries: state.entries, renameEntry: null }
  },
  _toAddedHunks(params: { changes: GitDiffParseLineChange[] }): GitDiffParseHunk[] {
    const { changes } = params
    if (changes.length === 0) {
      return []
    }

    return [
      {
        changes,
        content: `@@ -0,0 +1,${String(changes.length)} @@`,
        newLines: changes.length,
        newStart: 1,
        oldLines: 0,
        oldStart: 0,
      },
    ]
  },
  _toChangeLineNumbers(params: { change: parseDiff.Change }): {
    newLineNumber: number | null
    oldLineNumber: number | null
  } {
    const { change } = params
    switch (change.type) {
      case 'add': {
        return { newLineNumber: change.ln, oldLineNumber: null }
      }
      case 'del': {
        return { newLineNumber: null, oldLineNumber: change.ln }
      }
      case 'normal': {
        return { newLineNumber: change.ln2, oldLineNumber: change.ln1 }
      }
      default: {
        throw new Error('Unsupported diff change type')
      }
    }
  },
  _toStatCount(params: { token: string }): number | null {
    const { token } = params
    if (token === '-') {
      return null
    }

    return Number.parseInt(token, 10)
  },
  computeWordDiff(params: { newLine: string; oldLine: string }): GitDiffParseWordPart[] {
    const { newLine, oldLine } = params

    return diffWords(oldLine, newLine).map((part: Change): GitDiffParseWordPart => {
      return {
        isAdded: part.added,
        isRemoved: part.removed,
        value: part.value,
      }
    })
  },
  parseNumstatOutput(params: { output: string }): GitDiffParseNumstatEntry[] {
    const { output } = params
    const chunks = output.split('\0').filter((chunk: string) => {
      return chunk !== ''
    })
    const walkState = chunks.reduce(
      (state: NumstatWalkState, chunk: string): NumstatWalkState => {
        return gitDiffParseUtil._applyNumstatChunk({ chunk, state })
      },
      { entries: [], renameEntry: null },
    )

    return walkState.entries
  },
  parseUnifiedDiff(params: { diffText: string }): GitDiffParseFilePatch[] {
    const { diffText } = params

    return parseDiff(diffText).map((file: parseDiff.File): GitDiffParseFilePatch => {
      return {
        additions: file.additions,
        deletions: file.deletions,
        from: file.from ?? null,
        hunks: file.chunks.map((chunk: parseDiff.Chunk): GitDiffParseHunk => {
          return {
            changes: chunk.changes.map((change: parseDiff.Change): GitDiffParseLineChange => {
              const lineNumbers = gitDiffParseUtil._toChangeLineNumbers({ change })

              return {
                content: change.content,
                newLineNumber: lineNumbers.newLineNumber,
                oldLineNumber: lineNumbers.oldLineNumber,
                type: change.type as GitDiffChangeTypeMapper,
              }
            }),
            content: chunk.content,
            newLines: chunk.newLines,
            newStart: chunk.newStart,
            oldLines: chunk.oldLines,
            oldStart: chunk.oldStart,
          }
        }),
        to: file.to ?? null,
      }
    })
  },
  toAddedPatch(params: { content: string; isTruncated?: boolean; path: string }): GitDiffParseFilePatch {
    const { content, isTruncated, path } = params
    const addedLines = diffLines('', content).reduce<string[]>((lines, part: Change) => {
      if (!part.added) {
        return lines
      }

      return [...lines, ...part.value.replace(/\n$/, '').split('\n')]
    }, [])
    const changes: GitDiffParseLineChange[] = addedLines.map((line, index) => {
      return {
        content: `${line}\n`,
        newLineNumber: index + 1,
        oldLineNumber: null,
        type: GitDiffChangeTypeMapper.ADD,
      }
    })

    return {
      additions: changes.length,
      deletions: 0,
      from: null,
      hunks: gitDiffParseUtil._toAddedHunks({ changes }),
      isEmptyFile: content === '',
      isTruncated: isTruncated ?? false,
      to: path,
    }
  },
}

export { gitDiffParseUtil }
