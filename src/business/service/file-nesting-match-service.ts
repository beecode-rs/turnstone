import { type FileNestingPattern } from '#src/business/model/file-nesting-preference'
import { type TreeEntry } from '#src/business/model/tree-entry'
import { constant } from '#src/util/constant'
import { naturalSortUtil } from '#src/util/natural-sort-util'

export type FileNests = {
  childrenByParentName: Record<string, TreeEntry[]>
  nestedNames: string[]
}

export type PatternPreview = {
  childNames: string[]
  parentName: string
}

type FileNestParentCandidate = {
  capture: string
  name: string
}

type PatternCandidates = {
  candidates: FileNestParentCandidate[]
  pattern: FileNestingPattern
}

const cachedRegExpByPattern = new Map<string, RegExp>()

export class FileNestingMatchService {
  matchParent(params: { name: string; pattern: string }): string | null {
    const { name, pattern } = params
    const match = this._getRegExp({ pattern }).exec(name)
    if (match === null) {
      return null
    }
    if (!pattern.includes('*')) {
      return ''
    }

    return match[1]
  }

  resolveChildPattern(params: { capture: string; childPattern: string }): string {
    const { capture, childPattern } = params

    return childPattern.replaceAll('${capture}', capture).replaceAll('$(capture)', capture)
  }

  resolvePatternPreview(params: { pattern: FileNestingPattern }): PatternPreview {
    const { pattern } = params
    const parentName = pattern.parent.replace('*', constant.fileNesting.previewCapture)
    const capture = this.matchParent({ name: parentName, pattern: pattern.parent }) ?? ''
    const childNames = pattern.children.map((childPattern) => {
      return this.resolveChildPattern({ capture, childPattern })
    })

    return { childNames, parentName }
  }

  buildNests(params: { entries: TreeEntry[]; patterns: FileNestingPattern[] }): FileNests {
    const { entries, patterns } = params
    const filesByName = this._toFilesByName({ entries })
    const candidatesByPattern = patterns.map((pattern) => {
      return { candidates: this._resolveParentCandidates({ filesByName, pattern }), pattern }
    })
    const childNames = this._resolveChildNames({ candidatesByPattern, filesByName })
    const parentNameByChildName = this._assignChildrenToParents({ candidatesByPattern, childNames, filesByName })

    return {
      childrenByParentName: this._toChildrenByParentName({ filesByName, parentNameByChildName }),
      nestedNames: [...parentNameByChildName.keys()].sort((left, right) => {
        return naturalSortUtil.compare(left, right)
      }),
    }
  }

  protected _toFilesByName(params: { entries: TreeEntry[] }): Map<string, TreeEntry> {
    const { entries } = params

    return entries.reduce<Map<string, TreeEntry>>((filesByName, entry) => {
      if (entry.isDir) {
        return filesByName
      }
      filesByName.set(entry.name, entry)

      return filesByName
    }, new Map())
  }

  protected _resolveParentCandidates(params: {
    filesByName: Map<string, TreeEntry>
    pattern: FileNestingPattern
  }): FileNestParentCandidate[] {
    const { filesByName, pattern } = params

    return [...filesByName.keys()]
      .map((name) => {
        return { capture: this.matchParent({ name, pattern: pattern.parent }), name }
      })
      .filter((candidate): candidate is FileNestParentCandidate => {
        return candidate.capture !== null
      })
      .sort((left, right) => {
        return naturalSortUtil.compare(left.name, right.name)
      })
  }

  protected _resolveChildNames(params: {
    candidatesByPattern: PatternCandidates[]
    filesByName: Map<string, TreeEntry>
  }): Set<string> {
    const { candidatesByPattern, filesByName } = params

    return new Set(
      candidatesByPattern.reduce<string[]>((names, patternCandidates) => {
        return [
          ...names,
          ...patternCandidates.candidates.reduce<string[]>((candidateNames, candidate) => {
            return [
              ...candidateNames,
              ...this._resolveChildNamesForCandidate({
                candidate,
                filesByName,
                pattern: patternCandidates.pattern,
              }),
            ]
          }, []),
        ]
      }, []),
    )
  }

  protected _resolveChildNamesForCandidate(params: {
    candidate: FileNestParentCandidate
    filesByName: Map<string, TreeEntry>
    pattern: FileNestingPattern
  }): string[] {
    const { candidate, filesByName, pattern } = params
    const resolvedChildPatterns = pattern.children.map((childPattern) => {
      return this.resolveChildPattern({ capture: candidate.capture, childPattern })
    })

    return [...filesByName.keys()].filter((name) => {
      if (name === candidate.name) {
        return false
      }

      return resolvedChildPatterns.some((resolvedPattern) => {
        return this._getRegExp({ pattern: resolvedPattern }).test(name)
      })
    })
  }

  protected _assignChildrenToParents(params: {
    candidatesByPattern: PatternCandidates[]
    childNames: Set<string>
    filesByName: Map<string, TreeEntry>
  }): Map<string, string> {
    const { candidatesByPattern, childNames, filesByName } = params

    return candidatesByPattern.reduce<Map<string, string>>((parentNameByChildName, patternCandidates) => {
      return patternCandidates.candidates.reduce((claims, candidate) => {
        if (childNames.has(candidate.name)) {
          return claims
        }

        return this._resolveChildNamesForCandidate({
          candidate,
          filesByName,
          pattern: patternCandidates.pattern,
        }).reduce((childClaims, childName) => {
          if (childClaims.has(childName)) {
            return childClaims
          }
          childClaims.set(childName, candidate.name)

          return childClaims
        }, claims)
      }, parentNameByChildName)
    }, new Map())
  }

  protected _toChildrenByParentName(params: {
    filesByName: Map<string, TreeEntry>
    parentNameByChildName: Map<string, string>
  }): Record<string, TreeEntry[]> {
    const { filesByName, parentNameByChildName } = params
    const childNamesByParentName = this._toChildNamesByParentName({
      parentNameByChildName,
    })

    return Object.keys(childNamesByParentName)
      .sort((left, right) => {
        return naturalSortUtil.compare(left, right)
      })
      .reduce<Record<string, TreeEntry[]>>((childrenByParentName, parentName) => {
        childrenByParentName[parentName] = childNamesByParentName[parentName]
          .sort((left, right) => {
            return naturalSortUtil.compare(left, right)
          })
          .map((childName) => {
            return filesByName.get(childName)
          })
          .filter((entry): entry is TreeEntry => {
            return entry !== undefined
          })

        return childrenByParentName
      }, {})
  }

  protected _toChildNamesByParentName(params: {
    parentNameByChildName: Map<string, string>
  }): Record<string, string[]> {
    const { parentNameByChildName } = params

    return [...parentNameByChildName.entries()].reduce<Record<string, string[]>>(
      (childNamesByParentName, [childName, parentName]) => {
        return {
          ...childNamesByParentName,
          [parentName]: [...(childNamesByParentName[parentName] ?? []), childName],
        }
      },
      {},
    )
  }

  protected _getRegExp(params: { pattern: string }): RegExp {
    const { pattern } = params
    const cached = cachedRegExpByPattern.get(pattern)
    if (cached !== undefined) {
      return cached
    }
    const regExp = new RegExp(`^${this._toRegExpSource({ pattern })}$`)
    cachedRegExpByPattern.set(pattern, regExp)

    return regExp
  }

  protected _toRegExpSource(params: { pattern: string }): string {
    const { pattern } = params
    const escapedParts = pattern.split('*').map((part) => {
      return this._escapeRegExp({ value: part })
    })
    if (escapedParts.length === 1) {
      return escapedParts[0]
    }
    const [firstPart, ...restParts] = escapedParts

    return [firstPart, restParts.join('.*')].join('(.*)')
  }

  protected _escapeRegExp(params: { value: string }): string {
    const { value } = params

    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
}
