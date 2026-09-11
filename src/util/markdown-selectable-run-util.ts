const SELECTABLE_RUN_BLOCK_TYPES = new Set([
  'paragraph',
  'heading1',
  'heading2',
  'heading3',
  'heading4',
  'heading5',
  'heading6',
])

export type MarkdownSelectableRunBlock = { isSelectableRunSafe: boolean; type: string }

export type MarkdownSelectableRunGroup =
  { blockIndexes: number[]; kind: 'selectable-run' } | { blockIndex: number; kind: 'standalone-block' }

export const markdownSelectableRunUtil = {
  _isSelectableRunBlock(params: { block: MarkdownSelectableRunBlock }): boolean {
    const { block } = params

    return SELECTABLE_RUN_BLOCK_TYPES.has(block.type) && block.isSelectableRunSafe
  },
  groupBlocksBySelectableRun(params: { blocks: MarkdownSelectableRunBlock[] }): MarkdownSelectableRunGroup[] {
    const { blocks } = params

    return blocks.reduce<MarkdownSelectableRunGroup[]>((groups, block, blockIndex) => {
      const lastGroup = groups.at(-1)
      if (!markdownSelectableRunUtil._isSelectableRunBlock({ block })) {
        return [...groups, { blockIndex, kind: 'standalone-block' }]
      }
      if (lastGroup?.kind === 'selectable-run') {
        return [
          ...groups.slice(0, -1),
          { blockIndexes: [...lastGroup.blockIndexes, blockIndex], kind: 'selectable-run' },
        ]
      }

      return [...groups, { blockIndexes: [blockIndex], kind: 'selectable-run' }]
    }, [])
  },
}
