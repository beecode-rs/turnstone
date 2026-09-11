export type TreeReconcileEntry = {
  isDir: boolean
  mtime: number
  name: string
  size: number
}

export type TreeReconcileRename = {
  from: TreeReconcileEntry
  to: TreeReconcileEntry
}

export type TreeReconcileResult = {
  added: TreeReconcileEntry[]
  removed: TreeReconcileEntry[]
  renamed: TreeReconcileRename[]
}

export type InotifyEventLine = {
  events: string[]
  path: string
}

interface RenamePairingState {
  availableAdded: TreeReconcileEntry[]
  renamed: TreeReconcileRename[]
  unrenamedRemoved: TreeReconcileEntry[]
}

export const treeReconcileUtil = {
  _buildEntrySignature(params: { entry: TreeReconcileEntry }): string {
    const { entry } = params

    return `${String(entry.isDir)}|${String(entry.size)}|${String(entry.mtime)}`
  },
  _pairRenameStep(params: { removedEntry: TreeReconcileEntry; state: RenamePairingState }): RenamePairingState {
    const { removedEntry, state } = params
    const signature = treeReconcileUtil._buildEntrySignature({ entry: removedEntry })
    const matchIndex = state.availableAdded.findIndex((addedEntry) => {
      return treeReconcileUtil._buildEntrySignature({ entry: addedEntry }) === signature
    })
    if (matchIndex < 0) {
      return { ...state, unrenamedRemoved: [...state.unrenamedRemoved, removedEntry] }
    }
    const matchedEntry = state.availableAdded[matchIndex]

    return {
      availableAdded: state.availableAdded.filter((_, index) => {
        return index !== matchIndex
      }),
      renamed: [...state.renamed, { from: removedEntry, to: matchedEntry }],
      unrenamedRemoved: state.unrenamedRemoved,
    }
  },
  isPollingActive(params: { isAppForegrounded: boolean; isScreenFocused: boolean }): boolean {
    const { isAppForegrounded, isScreenFocused } = params

    return isAppForegrounded && isScreenFocused
  },
  parseInotifyLine(params: { line: string }): InotifyEventLine | null {
    const { line } = params
    const separatorIndex = line.indexOf('\t')
    if (separatorIndex < 0) {
      return null
    }
    const eventsPart = line.slice(0, separatorIndex)
    const pathPart = line.slice(separatorIndex + 1)
    if (eventsPart.length === 0 || pathPart.length === 0) {
      return null
    }

    return { events: eventsPart.split(','), path: pathPart }
  },
  reconcileChildren(params: { after: TreeReconcileEntry[]; before: TreeReconcileEntry[] }): TreeReconcileResult {
    const { after, before } = params
    const beforeByName = new Map<string, TreeReconcileEntry>(
      before.map((entry) => {
        return [entry.name, entry]
      }),
    )
    const afterByName = new Map<string, TreeReconcileEntry>(
      after.map((entry) => {
        return [entry.name, entry]
      }),
    )
    const removedEntries = before.filter((entry) => {
      return !afterByName.has(entry.name)
    })
    const addedEntries = after.filter((entry) => {
      return !beforeByName.has(entry.name)
    })
    const pairing = removedEntries.reduce<RenamePairingState>(
      (state, removedEntry) => {
        return treeReconcileUtil._pairRenameStep({ removedEntry, state })
      },
      { availableAdded: addedEntries, renamed: [], unrenamedRemoved: [] },
    )

    return { added: pairing.availableAdded, removed: pairing.unrenamedRemoved, renamed: pairing.renamed }
  },
}
