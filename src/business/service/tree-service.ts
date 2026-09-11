import { type SshDirEntry, type SshTransport } from '#src/business/model/ssh-transport'
import { type TreeEntry } from '#src/business/model/tree-entry'
import { constant } from '#src/util/constant'
import { naturalSortUtil } from '#src/util/natural-sort-util'

export class TreeService {
  async listDirectory(params: { path: string; transport: SshTransport }): Promise<TreeEntry[]> {
    const { path, transport } = params
    const dirEntries = await transport.readDir({ path })
    const treeEntries = dirEntries.map((entry) => {
      return this.toTreeEntry({ entry })
    })

    return this.sortEntries({ entries: treeEntries })
  }

  async listSubdirectoryNames(params: { path: string; transport: SshTransport }): Promise<string[]> {
    const entries = await this.listDirectory(params)

    return this.toSubdirectoryNames({ entries })
  }

  toSubdirectoryNames(params: { entries: TreeEntry[] }): string[] {
    const { entries } = params

    return entries
      .filter((entry) => {
        return entry.isDir
      })
      .map((entry) => {
        return entry.name
      })
  }

  toTreeEntry(params: { entry: SshDirEntry }): TreeEntry {
    const { entry } = params

    return {
      isDir: entry.isDirectory,
      mtime: entry.modifiedAtSeconds,
      name: entry.filename,
      size: entry.size,
    }
  }

  sortEntries(params: { entries: TreeEntry[] }): TreeEntry[] {
    const { entries } = params
    const sorted = [...entries]

    sorted.sort((left, right) => {
      return this.compareEntries({ left, right })
    })

    return sorted
  }

  compareEntries(params: { left: TreeEntry; right: TreeEntry }): number {
    const { left, right } = params
    if (left.isDir !== right.isDir) {
      return this._compareByKind({ left, right })
    }

    return naturalSortUtil.compare(left.name, right.name)
  }

  paginate(params: { entries: TreeEntry[]; limit?: number; offset: number }): TreeEntry[] {
    const { entries, limit, offset } = params
    const resolvedLimit = limit ?? constant.tree.defaultPageSize

    return entries.slice(offset, offset + resolvedLimit)
  }

  protected _compareByKind(params: { left: TreeEntry; right: TreeEntry }): number {
    const { left } = params
    if (left.isDir) {
      return -1
    }

    return 1
  }
}
