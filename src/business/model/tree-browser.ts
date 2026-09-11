import { type TreeEntry } from '#src/business/model/tree-entry'

export type TreeRowItem = {
  depth: number
  entry: TreeEntry
  hasNestedChildren: boolean
  isExpanded: boolean
  path: string
}
