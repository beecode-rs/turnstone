import { Buffer } from 'buffer'
import { AppState, type AppStateStatus, type NativeEventSubscription } from 'react-native'

import { type SshTransport } from '#src/business/model/ssh-transport'
import { type TreeEntry } from '#src/business/model/tree-entry'
import { type CapabilityProbeService } from '#src/business/service/capability-probe-service'
import { type TreeService } from '#src/business/service/tree-service'
import { backoffUtil } from '#src/util/backoff-util'
import { constant } from '#src/util/constant'
import { lineSplitUtil } from '#src/util/line-split-util'
import { remotePathUtil } from '#src/util/remote-path-util'
import { shellQuoteUtil } from '#src/util/shell-quote-util'
import { treeReconcileUtil } from '#src/util/tree-reconcile-util'

export type ChangeWatcherFileChange = {
  mtime: number
  path: string
  size: number
}

export type ChangeWatcherRenamePair = {
  from: TreeEntry
  to: TreeEntry
}

export type ChangeWatcherDirectoryChange = {
  added: TreeEntry[]
  children: TreeEntry[]
  path: string
  removed: TreeEntry[]
  renamed: ChangeWatcherRenamePair[]
}

type WatcherTimerId = ReturnType<typeof setTimeout> | undefined

type FileWatchState = {
  isFocused: () => boolean
  lastStat: { mtime: number; size: number } | null
  onChange: (change: ChangeWatcherFileChange) => void
}

type DirectoryWatchState = {
  getPaths: () => string[]
  onReconcile: (change: ChangeWatcherDirectoryChange) => void
}

type InotifyWatchState = {
  attempt: number
  cancel: () => void
  pendingTail: number[]
  retryTimerId: WatcherTimerId
  watchedPaths: string[]
}

type HostWatchState = {
  closeUnsubscribe: () => void
  directoryWatch: DirectoryWatchState | null
  dirTimerId: WatcherTimerId
  dirtyPaths: Set<string>
  dirtyTimerId: WatcherTimerId
  fileTimerId: WatcherTimerId
  fileWatches: Map<string, FileWatchState>
  inotify: InotifyWatchState | null
  isInotifyCapable: boolean
  lastChildrenByPath: Map<string, TreeEntry[]>
  lastMtimeByPath: Map<string, number>
  transport: SshTransport
}

export class ChangeWatcherService {
  protected _appStateSubscription: NativeEventSubscription | null
  protected readonly _capabilityProbe: CapabilityProbeService
  protected _isAppForegrounded: boolean
  protected readonly _treeService: TreeService
  protected readonly _watchers: Map<string, HostWatchState>

  constructor(params: { capabilityProbe: CapabilityProbeService; treeService: TreeService }) {
    const { capabilityProbe, treeService } = params
    this._appStateSubscription = AppState.addEventListener('change', (status: AppStateStatus) => {
      this._onAppStateChange({ status })
    })
    this._capabilityProbe = capabilityProbe
    this._isAppForegrounded = true
    this._treeService = treeService
    this._watchers = new Map()
  }

  watchFile(params: {
    hostId: string
    isFocused: () => boolean
    onChange: (change: ChangeWatcherFileChange) => void
    path: string
    transport: SshTransport
  }): () => void {
    const { hostId, isFocused, onChange, path, transport } = params
    const state = this._getOrCreateHostState({ hostId, transport })
    state.fileWatches.set(path, {
      isFocused,
      lastStat: null,
      onChange,
    })
    this._pokeFilePoll({ hostId })

    return () => {
      this._removeFileWatch({ hostId, path })
    }
  }

  watchDirectories(params: {
    getPaths: () => string[]
    hostId: string
    onReconcile: (change: ChangeWatcherDirectoryChange) => void
    transport: SshTransport
  }): () => void {
    const { getPaths, hostId, onReconcile, transport } = params
    const state = this._getOrCreateHostState({ hostId, transport })
    state.directoryWatch = { getPaths, onReconcile }
    this._startInotifyIfCapable({ hostId, state })
    this._pokeDirectoryPoll({ hostId })

    return () => {
      this._removeDirectoryWatch({ hostId })
    }
  }

  updateTransport(params: { hostId: string; transport: SshTransport }): void {
    const { hostId, transport } = params
    const state = this._watchers.get(hostId)
    if (state === undefined) {
      return
    }
    this._attachTransportIfChanged({ hostId, state, transport })
  }

  destroy(): void {
    Array.from(this._watchers.entries()).forEach(([hostId, state]) => {
      state.fileWatches.clear()
      state.directoryWatch = null
      this._stopHostActivity({ state })
      state.closeUnsubscribe()
      this._watchers.delete(hostId)
    })
    this._appStateSubscription?.remove()
    this._appStateSubscription = null
  }

  buildInotifyCommand(params: { paths: string[] }): string {
    const { paths } = params
    const quotedPaths = paths.map((path) => {
      return shellQuoteUtil.quoteShellWord({ word: path })
    })

    return `LC_ALL=C inotifywait -m -q -e close_write,create,delete,move,moved_to,moved_from --format '%e\\t%w%f' ${quotedPaths.join(' ')}`
  }

  protected _getOrCreateHostState(params: { hostId: string; transport: SshTransport }): HostWatchState {
    const { hostId, transport } = params
    const existingState = this._watchers.get(hostId)
    if (existingState !== undefined) {
      this._attachTransportIfChanged({ hostId, state: existingState, transport })

      return existingState
    }
    const state: HostWatchState = {
      closeUnsubscribe: () => {
        return undefined
      },
      directoryWatch: null,
      dirTimerId: undefined,
      dirtyPaths: new Set(),
      dirtyTimerId: undefined,
      fileTimerId: undefined,
      fileWatches: new Map(),
      inotify: null,
      isInotifyCapable: false,
      lastChildrenByPath: new Map(),
      lastMtimeByPath: new Map(),
      transport,
    }
    state.closeUnsubscribe = transport.subscribeToClose(() => {
      this._onTransportClosed({ hostId })
    })
    this._watchers.set(hostId, state)

    return state
  }

  protected _attachTransportIfChanged(params: {
    hostId: string
    state: HostWatchState
    transport: SshTransport
  }): void {
    const { hostId, state, transport } = params
    if (state.transport === transport) {
      return
    }
    this._stopInotify({ state })
    state.closeUnsubscribe()
    state.transport = transport
    state.closeUnsubscribe = transport.subscribeToClose(() => {
      this._onTransportClosed({ hostId })
    })
    this._startInotifyIfCapable({ hostId, state })
    this._pokeHost({ hostId })
  }

  protected _onAppStateChange(params: { status: AppStateStatus }): void {
    const { status } = params
    this._isAppForegrounded = status === 'active'
    if (!this._isAppForegrounded) {
      return
    }
    Array.from(this._watchers.keys()).forEach((hostId) => {
      this._pokeHost({ hostId })
    })
  }

  protected _pokeHost(params: { hostId: string }): void {
    const { hostId } = params
    const state = this._watchers.get(hostId)
    if (state === undefined) {
      return
    }
    if (state.fileWatches.size > 0) {
      this._pokeFilePoll({ hostId })
    }
    if (state.directoryWatch !== null) {
      this._pokeDirectoryPoll({ hostId })
    }
  }

  protected _pokeFilePoll(params: { hostId: string }): void {
    const { hostId } = params
    const state = this._watchers.get(hostId)
    if (state === undefined) {
      return
    }
    this._clearFileTimer({ state })
    this._onFilePollTimer({ hostId })
  }

  protected _pokeDirectoryPoll(params: { hostId: string }): void {
    const { hostId } = params
    const state = this._watchers.get(hostId)
    if (state === undefined) {
      return
    }
    this._clearDirTimer({ state })
    this._onDirectoryPollTimer({ hostId })
  }

  protected _onFilePollTimer(params: { hostId: string }): void {
    const { hostId } = params
    const state = this._watchers.get(hostId)
    if (state === undefined) {
      return
    }
    state.fileTimerId = undefined
    if (state.fileWatches.size === 0) {
      return
    }
    Array.from(state.fileWatches.entries()).forEach(([path, watch]) => {
      void this._pollFileWatch({ path, state, watch })
    })
    this._scheduleFilePoll({ hostId, state })
  }

  protected _onDirectoryPollTimer(params: { hostId: string }): void {
    const { hostId } = params
    const state = this._watchers.get(hostId)
    if (state === undefined) {
      return
    }
    state.dirTimerId = undefined
    if (state.directoryWatch === null) {
      return
    }
    state.directoryWatch.getPaths().forEach((path) => {
      void this._refreshDirectory({ isForced: false, path, state })
    })
    this._ensureInotify({ hostId, state })
    this._scheduleDirectoryPoll({ hostId, state })
  }

  protected _scheduleFilePoll(params: { hostId: string; state: HostWatchState }): void {
    const { hostId, state } = params
    if (state.fileTimerId !== undefined) {
      clearTimeout(state.fileTimerId)
    }
    state.fileTimerId = setTimeout(() => {
      this._onFilePollTimer({ hostId })
    }, constant.changeWatcher.filePollIntervalMs)
  }

  protected _scheduleDirectoryPoll(params: { hostId: string; state: HostWatchState }): void {
    const { hostId, state } = params
    if (state.dirTimerId !== undefined) {
      clearTimeout(state.dirTimerId)
    }
    state.dirTimerId = setTimeout(() => {
      this._onDirectoryPollTimer({ hostId })
    }, constant.changeWatcher.directoryPollIntervalMs)
  }

  protected _clearFileTimer(params: { state: HostWatchState }): void {
    const { state } = params
    const timerId = state.fileTimerId
    if (timerId === undefined) {
      return
    }
    clearTimeout(timerId)
    state.fileTimerId = undefined
  }

  protected _clearDirTimer(params: { state: HostWatchState }): void {
    const { state } = params
    const timerId = state.dirTimerId
    if (timerId === undefined) {
      return
    }
    clearTimeout(timerId)
    state.dirTimerId = undefined
  }

  protected _clearDirtyTimer(params: { state: HostWatchState }): void {
    const { state } = params
    const timerId = state.dirtyTimerId
    if (timerId === undefined) {
      return
    }
    clearTimeout(timerId)
    state.dirtyTimerId = undefined
  }

  protected async _pollFileWatch(params: {
    path: string
    state: HostWatchState
    watch: FileWatchState
  }): Promise<void> {
    const { path, state, watch } = params
    const isPollingActive = treeReconcileUtil.isPollingActive({
      isAppForegrounded: this._isAppForegrounded,
      isScreenFocused: watch.isFocused(),
    })
    if (!isPollingActive) {
      return
    }
    try {
      const fileStat = await state.transport.stat({ path })
      const lastStat = watch.lastStat
      watch.lastStat = { mtime: fileStat.modifiedAtSeconds, size: fileStat.size }
      if (lastStat === null) {
        return
      }
      if (lastStat.mtime === fileStat.modifiedAtSeconds && lastStat.size === fileStat.size) {
        return
      }
      watch.onChange({ mtime: fileStat.modifiedAtSeconds, path, size: fileStat.size })
    } catch {
      return undefined
    }
  }

  protected async _refreshDirectory(params: { isForced: boolean; path: string; state: HostWatchState }): Promise<void> {
    const { isForced, path, state } = params
    const directoryWatch = state.directoryWatch
    if (directoryWatch === null) {
      return
    }
    try {
      const dirStat = await state.transport.stat({ path })
      const knownMtime = state.lastMtimeByPath.get(path)
      if (knownMtime === undefined) {
        state.lastMtimeByPath.set(path, dirStat.modifiedAtSeconds)
        state.lastChildrenByPath.set(path, await this._treeService.listDirectory({ path, transport: state.transport }))

        return
      }
      if (!isForced && knownMtime === dirStat.modifiedAtSeconds) {
        return
      }
      const children = await this._treeService.listDirectory({ path, transport: state.transport })
      const before = state.lastChildrenByPath.get(path) ?? []
      const reconcile = treeReconcileUtil.reconcileChildren({ after: children, before })
      state.lastMtimeByPath.set(path, dirStat.modifiedAtSeconds)
      state.lastChildrenByPath.set(path, children)
      directoryWatch.onReconcile({
        added: reconcile.added,
        children,
        path,
        removed: reconcile.removed,
        renamed: reconcile.renamed,
      })
    } catch {
      return undefined
    }
  }

  protected _startInotifyIfCapable(params: { hostId: string; state: HostWatchState }): void {
    const { hostId, state } = params
    void this._capabilityProbe
      .probe({ hostId, transport: state.transport })
      .then((capabilities) => {
        if (this._watchers.get(hostId) !== state) {
          return
        }
        state.isInotifyCapable = capabilities.isInotifyAvailable
        this._ensureInotify({ hostId, state })
      })
      .catch(() => {
        return undefined
      })
  }

  protected _ensureInotify(params: { hostId: string; state: HostWatchState }): void {
    const { hostId, state } = params
    if (!state.isInotifyCapable || state.directoryWatch === null) {
      return
    }
    const currentPaths = state.directoryWatch.getPaths()
    const inotify = state.inotify
    if (inotify !== null) {
      const isSameSet =
        currentPaths.length === inotify.watchedPaths.length &&
        inotify.watchedPaths.every((watchedPath) => {
          return currentPaths.includes(watchedPath)
        })
      if (isSameSet) {
        return
      }
      this._stopInotify({ state })
    }
    if (currentPaths.length === 0) {
      return
    }
    this._startInotify({ hostId, paths: currentPaths, state })
  }

  protected _startInotify(params: { hostId: string; paths: string[]; state: HostWatchState }): void {
    const { hostId, paths, state } = params
    const inotify: InotifyWatchState = {
      attempt: 0,
      cancel: () => {
        return undefined
      },
      pendingTail: [],
      retryTimerId: undefined,
      watchedPaths: paths,
    }
    state.inotify = inotify
    const handle = state.transport.exec({
      command: this.buildInotifyCommand({ paths }),
      onStderrChunk: () => {
        return undefined
      },
      onStdoutChunk: (chunk: Buffer) => {
        this._onInotifyChunk({ chunk, hostId, inotify, state })
      },
    })
    inotify.cancel = handle.cancel
    void handle.result
      .then(() => {
        this._onInotifyClosed({ hostId, inotify, state })
      })
      .catch(() => {
        this._onInotifyClosed({ hostId, inotify, state })
      })
  }

  protected _stopInotify(params: { state: HostWatchState }): void {
    const { state } = params
    const inotify = state.inotify
    if (inotify === null) {
      return
    }
    if (inotify.retryTimerId !== undefined) {
      clearTimeout(inotify.retryTimerId)
      inotify.retryTimerId = undefined
    }
    inotify.cancel()
    state.inotify = null
  }

  protected _onInotifyClosed(params: { hostId: string; inotify: InotifyWatchState; state: HostWatchState }): void {
    const { hostId, inotify, state } = params
    if (this._watchers.get(hostId) !== state || state.inotify !== inotify) {
      return
    }
    this._flushInotifyTail({ hostId, inotify, state })
    inotify.attempt += 1
    inotify.retryTimerId = setTimeout(
      () => {
        inotify.retryTimerId = undefined
        if (this._watchers.get(hostId) !== state || state.inotify !== inotify) {
          return
        }
        state.inotify = null
        this._ensureInotify({ hostId, state })
      },
      backoffUtil.delayMs({ attempt: inotify.attempt }),
    )
  }

  protected _onInotifyChunk(params: {
    chunk: Buffer
    hostId: string
    inotify: InotifyWatchState
    state: HostWatchState
  }): void {
    const { chunk, hostId, inotify, state } = params
    const split = lineSplitUtil.splitChunk({ chunk, pendingTail: inotify.pendingTail })
    inotify.pendingTail = split.pendingTail
    split.lines.forEach((lineBytes) => {
      this._handleInotifyLineBytes({ hostId, inotify, lineBytes, state })
    })
  }

  protected _flushInotifyTail(params: { hostId: string; inotify: InotifyWatchState; state: HostWatchState }): void {
    const { hostId, inotify, state } = params
    const flushed = lineSplitUtil.flushLines({ pendingTail: inotify.pendingTail })
    inotify.pendingTail = []
    flushed.lines.forEach((lineBytes) => {
      this._handleInotifyLineBytes({ hostId, inotify, lineBytes, state })
    })
  }

  protected _handleInotifyLineBytes(params: {
    hostId: string
    inotify: InotifyWatchState
    lineBytes: number[]
    state: HostWatchState
  }): void {
    const { hostId, lineBytes, state } = params
    const parsedLine = treeReconcileUtil.parseInotifyLine({ line: Buffer.from(lineBytes).toString('utf8') })
    if (parsedLine === null) {
      return
    }
    const watchedPath = this._resolveWatchedEventPath({ eventPath: parsedLine.path, state })
    if (watchedPath === null) {
      return
    }
    state.dirtyPaths.add(watchedPath)
    if (state.dirtyTimerId !== undefined) {
      return
    }
    state.dirtyTimerId = setTimeout(() => {
      this._onInotifyDirtyTimer({ hostId, state })
    }, constant.changeWatcher.inotifyDirtyDebounceMs)
  }

  protected _onInotifyDirtyTimer(params: { hostId: string; state: HostWatchState }): void {
    const { state } = params
    state.dirtyTimerId = undefined
    const dirtyPaths = Array.from(state.dirtyPaths)
    state.dirtyPaths = new Set()
    dirtyPaths.forEach((path) => {
      void this._refreshDirectory({ isForced: true, path, state })
    })
  }

  protected _resolveWatchedEventPath(params: { eventPath: string; state: HostWatchState }): string | null {
    const { eventPath, state } = params
    const watchedSet = new Set(state.directoryWatch?.getPaths() ?? [])
    const targetPath = this._stripTrailingSlash({ path: eventPath })
    if (watchedSet.has(targetPath)) {
      return targetPath
    }
    const parentPath = this._dirName({ path: targetPath })
    if (watchedSet.has(parentPath)) {
      return parentPath
    }

    return null
  }

  protected _stripTrailingSlash(params: { path: string }): string {
    const { path } = params
    if (path.length > 1 && path.endsWith('/')) {
      return path.slice(0, -1)
    }

    return path
  }

  protected _dirName(params: { path: string }): string {
    const { path } = params
    const parentParts = remotePathUtil.toParts({ path }).slice(0, -1)

    return `/${parentParts.join('/')}`
  }

  protected _removeFileWatch(params: { hostId: string; path: string }): void {
    const { hostId, path } = params
    const state = this._watchers.get(hostId)
    if (state === undefined) {
      return
    }
    state.fileWatches.delete(path)
    if (state.fileWatches.size > 0) {
      return
    }
    this._clearFileTimer({ state })
    this._dropHostIfIdle({ hostId, state })
  }

  protected _removeDirectoryWatch(params: { hostId: string }): void {
    const { hostId } = params
    const state = this._watchers.get(hostId)
    if (state === undefined) {
      return
    }
    state.directoryWatch = null
    state.dirtyPaths = new Set()
    this._clearDirTimer({ state })
    this._clearDirtyTimer({ state })
    this._stopInotify({ state })
    this._dropHostIfIdle({ hostId, state })
  }

  protected _onTransportClosed(params: { hostId: string }): void {
    const { hostId } = params
    const state = this._watchers.get(hostId)
    if (state === undefined) {
      return
    }
    this._stopHostActivity({ state })
  }

  protected _stopHostActivity(params: { state: HostWatchState }): void {
    const { state } = params
    this._clearFileTimer({ state })
    this._clearDirTimer({ state })
    this._clearDirtyTimer({ state })
    this._stopInotify({ state })
  }

  protected _dropHostIfIdle(params: { hostId: string; state: HostWatchState }): void {
    const { hostId, state } = params
    if (state.fileWatches.size > 0 || state.directoryWatch !== null) {
      return
    }
    this._stopHostActivity({ state })
    state.closeUnsubscribe()
    this._watchers.delete(hostId)
  }
}
