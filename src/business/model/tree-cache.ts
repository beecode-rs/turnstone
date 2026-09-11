import { type TreeEntry } from '#src/business/model/tree-entry'

export type TreeCacheRecord = {
  children: TreeEntry[]
  dirMtime: number
}
