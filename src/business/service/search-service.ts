import { SearchCommandContentTierMapper } from '#src/business/enum/search-command-content-tier-mapper-enum'
import { SearchCommandFilenameTierMapper } from '#src/business/enum/search-command-filename-tier-mapper-enum'
import { SearchModeMapper } from '#src/business/enum/search-mode-mapper-enum'
import { type HostCapabilities } from '#src/business/model/host-capabilities'
import { type SearchMatch } from '#src/business/model/search-match'
import { type SshExecResult, type SshTransport } from '#src/business/model/ssh-transport'
import { type CapabilityProbeService } from '#src/business/service/capability-probe-service'
import { type RemoteExecService } from '#src/business/service/remote-exec-service'
import { SearchMatchFilterService } from '#src/business/service/search-match-filter-service'
import { constant } from '#src/util/constant'
import { fuzzyScoreUtil } from '#src/util/fuzzy-score-util'
import { searchCommandUtil } from '#src/util/search-command-util'
import { type SearchParseMatch, searchParseUtil } from '#src/util/search-parse-util'

export type SearchHandle = {
  cancel: () => void
  result: Promise<SshExecResult>
}

export type SearchParams = {
  hostId: string
  isIgnoredFilesIncluded?: boolean
  mode: SearchModeMapper
  onBatch: (batch: SearchMatch[]) => void
  pattern: string
  root: string
  transport: SshTransport
}

type SearchCancelState = {
  cancelExec: (() => void) | null
  isCancelled: boolean
}

type ContentStreamState = {
  buffer: SearchMatch[]
  totalMatchCount: number
}

type ScoredFilenameEntry = {
  match: SearchMatch
  score: number | null
}

type ScoredFilenameMatch = {
  match: SearchMatch
  score: number
}

type ContentConsumeParams = {
  cancelState: SearchCancelState
  line: string
  onBatch: (batch: SearchMatch[]) => void
  streamState: ContentStreamState
  tier: SearchCommandContentTierMapper
}

export class SearchService {
  protected readonly _capabilityProbe: CapabilityProbeService
  protected readonly _remoteExec: RemoteExecService

  constructor(params: { capabilityProbe: CapabilityProbeService; remoteExec: RemoteExecService }) {
    const { capabilityProbe, remoteExec } = params
    this._capabilityProbe = capabilityProbe
    this._remoteExec = remoteExec
  }

  search(params: SearchParams): SearchHandle {
    const { isIgnoredFilesIncluded, onBatch, transport } = params
    const cancelState: SearchCancelState = { cancelExec: null, isCancelled: false }
    const batchDelivery = this._toBatchDelivery({
      isIgnoredFilesIncluded,
      onBatch,
      transport,
    })

    return {
      cancel: () => {
        this._cancelSearch({ cancelState })
      },
      result: this._runSearch({ ...params, cancelState, onBatch: batchDelivery.deliver }).finally(() => {
        return batchDelivery.settle()
      }),
    }
  }

  protected _cancelSearch(params: { cancelState: SearchCancelState }): void {
    const { cancelState } = params
    cancelState.isCancelled = true
    if (cancelState.cancelExec !== null) {
      cancelState.cancelExec()
    }
  }

  protected _toBatchDelivery(params: {
    isIgnoredFilesIncluded?: boolean
    onBatch: (batch: SearchMatch[]) => void
    transport: SshTransport
  }): { deliver: (batch: SearchMatch[]) => void; settle: () => Promise<void> } {
    const { isIgnoredFilesIncluded, onBatch, transport } = params
    if (isIgnoredFilesIncluded) {
      return {
        deliver: onBatch,
        settle: () => {
          return Promise.resolve()
        },
      }
    }
    const filterService = new SearchMatchFilterService()
    const pendingState: { matches: SearchMatch[] } = { matches: [] }

    return {
      deliver: (batch: SearchMatch[]) => {
        pendingState.matches = [...pendingState.matches, ...batch]
      },
      settle: () => {
        return filterService
          .filterMatches({ matches: pendingState.matches, transport })
          .catch(() => {
            return pendingState.matches
          })
          .then((keptMatches: SearchMatch[]) => {
            this._emitBatchRange({
              batchIndex: 0,
              matches: keptMatches,
              onBatch,
            })
          })
      },
    }
  }

  protected async _runSearch(params: SearchParams & { cancelState: SearchCancelState }): Promise<SshExecResult> {
    const { cancelState, hostId, mode, transport } = params
    const capabilities = await this._capabilityProbe.probe({
      hostId,
      transport,
    })
    if (cancelState.isCancelled) {
      throw new Error('Search cancelled')
    }
    if (mode === SearchModeMapper.FILENAME) {
      return await this._runFilenameSearch({ ...params, capabilities })
    }

    return await this._runContentSearch({ ...params, capabilities })
  }

  protected async _runContentSearch(
    params: SearchParams & { capabilities: HostCapabilities; cancelState: SearchCancelState },
  ): Promise<SshExecResult> {
    const { capabilities, cancelState, isIgnoredFilesIncluded, onBatch, pattern, root, transport } = params
    const tier = searchCommandUtil.selectContentTier({ capabilities })
    const streamState: ContentStreamState = { buffer: [], totalMatchCount: 0 }
    const handle = this._remoteExec.execLines({
      command: this._buildContentCommand({
        isIgnoredFilesIncluded,
        pattern,
        root,
        tier,
      }),
      onLine: (line: string) => {
        this._consumeContentLine({
          cancelState,
          line,
          onBatch,
          streamState,
          tier,
        })
      },
      transport,
    })
    cancelState.cancelExec = handle.cancel
    const execResult = await handle.result
    this._flushContentBuffer({ onBatch, streamState })

    return execResult
  }

  protected async _runFilenameSearch(
    params: SearchParams & { capabilities: HostCapabilities; cancelState: SearchCancelState },
  ): Promise<SshExecResult> {
    const { capabilities, cancelState, isIgnoredFilesIncluded, onBatch, pattern, root, transport } = params
    const tier = searchCommandUtil.selectFilenameTier({ capabilities })
    const collectedPaths: string[] = []
    const handle = this._remoteExec.execLines({
      command: this._buildFilenameCommand({
        isIgnoredFilesIncluded,
        pattern,
        root,
        tier,
      }),
      onLine: (line: string) => {
        this._consumeFilenameLine({ cancelState, collectedPaths, line })
      },
      transport,
    })
    cancelState.cancelExec = handle.cancel
    const execResult = await handle.result
    this._emitFilenameBatches({
      collectedPaths,
      onBatch,
      pattern,
    })

    return execResult
  }

  protected _buildContentCommand(params: {
    isIgnoredFilesIncluded?: boolean
    pattern: string
    root: string
    tier: SearchCommandContentTierMapper
  }): string {
    const { isIgnoredFilesIncluded, pattern, root, tier } = params
    switch (tier) {
      case SearchCommandContentTierMapper.RIPGREP: {
        return searchCommandUtil.buildRipgrepContentCommand({
          isIgnoredFilesIncluded,
          pattern,
          root,
        })
      }
      case SearchCommandContentTierMapper.GREP: {
        return searchCommandUtil.buildGrepContentCommand({
          pattern,
          root,
        })
      }
      case SearchCommandContentTierMapper.FIND_GREP: {
        return searchCommandUtil.buildFindGrepContentCommand({
          pattern,
          root,
        })
      }
      default: {
        throw new Error('Unknown search content tier')
      }
    }
  }

  protected _buildFilenameCommand(params: {
    isIgnoredFilesIncluded?: boolean
    pattern: string
    root: string
    tier: SearchCommandFilenameTierMapper
  }): string {
    const { isIgnoredFilesIncluded, pattern, root, tier } = params
    switch (tier) {
      case SearchCommandFilenameTierMapper.RIPGREP: {
        return searchCommandUtil.buildRipgrepFilenameCommand({
          isIgnoredFilesIncluded,
          pattern,
          root,
        })
      }
      case SearchCommandFilenameTierMapper.FIND_GREP: {
        return searchCommandUtil.buildFindFilenameCommand({
          pattern,
          root,
        })
      }
      default: {
        throw new Error('Unknown search filename tier')
      }
    }
  }

  protected _consumeContentLine(params: ContentConsumeParams): void {
    const { cancelState, line, onBatch, streamState, tier } = params
    if (streamState.totalMatchCount >= constant.search.maxMatchCount) {
      return
    }
    const parsed = this._parseContentLine({ line, tier })
    if (parsed === null) {
      return
    }
    const nextTotal = streamState.totalMatchCount + 1
    const match = this._toSearchMatch({ parsed })
    streamState.totalMatchCount = nextTotal
    if (streamState.buffer.length + 1 >= constant.search.matchBatchSize) {
      onBatch([...streamState.buffer, match])
      streamState.buffer = []
    } else {
      streamState.buffer = [...streamState.buffer, match]
    }
    if (nextTotal >= constant.search.maxMatchCount) {
      cancelState.cancelExec?.()
    }
  }

  protected _flushContentBuffer(params: {
    onBatch: (batch: SearchMatch[]) => void
    streamState: ContentStreamState
  }): void {
    const { onBatch, streamState } = params
    if (streamState.buffer.length === 0) {
      return
    }
    onBatch(streamState.buffer)
    streamState.buffer = []
  }

  protected _consumeFilenameLine(params: {
    cancelState: SearchCancelState
    collectedPaths: string[]
    line: string
  }): void {
    const { cancelState, collectedPaths, line } = params
    if (collectedPaths.length >= constant.search.maxMatchCount) {
      cancelState.cancelExec?.()

      return
    }
    const path = line.trim()
    if (path === '') {
      return
    }
    collectedPaths.push(path)
  }

  protected _emitFilenameBatches(params: {
    collectedPaths: string[]
    onBatch: (batch: SearchMatch[]) => void
    pattern: string
  }): void {
    const { collectedPaths, onBatch, pattern } = params
    const scoredMatches = collectedPaths
      .map((path: string): ScoredFilenameEntry => {
        return {
          match: { lineNumber: null, lineText: null, path, submatches: [] },
          score: fuzzyScoreUtil.score({ query: pattern, target: path }),
        }
      })
      .filter((entry): entry is ScoredFilenameMatch => {
        return entry.score !== null
      })
      .sort((left: ScoredFilenameMatch, right: ScoredFilenameMatch) => {
        return right.score - left.score
      })
      .slice(0, constant.search.maxMatchCount)
      .map((entry: ScoredFilenameMatch) => {
        return entry.match
      })
    this._emitBatchRange({
      batchIndex: 0,
      matches: scoredMatches,
      onBatch,
    })
  }

  protected _emitBatchRange(params: {
    batchIndex: number
    matches: SearchMatch[]
    onBatch: (batch: SearchMatch[]) => void
  }): void {
    const { batchIndex, matches, onBatch } = params
    if (batchIndex >= Math.ceil(matches.length / constant.search.matchBatchSize)) {
      return
    }
    const start = batchIndex * constant.search.matchBatchSize
    onBatch(matches.slice(start, start + constant.search.matchBatchSize))
    this._emitBatchRange({ batchIndex: batchIndex + 1, matches, onBatch })
  }

  protected _parseContentLine(params: { line: string; tier: SearchCommandContentTierMapper }): SearchParseMatch | null {
    const { line, tier } = params
    if (tier === SearchCommandContentTierMapper.RIPGREP) {
      return searchParseUtil.parseRipgrepJsonLine({ line })
    }

    return searchParseUtil.parseGrepLine({ line })
  }

  protected _toSearchMatch(params: { parsed: SearchParseMatch }): SearchMatch {
    const { parsed } = params

    return {
      lineNumber: parsed.lineNumber,
      lineText: parsed.lineText,
      path: parsed.path,
      submatches: parsed.submatches,
    }
  }
}
