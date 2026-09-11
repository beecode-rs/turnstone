import { type MarkdownCodeBlock } from '#src/business/model/markdown-code-block'

const blocksByHostId = new Map<string, MarkdownCodeBlock>()

export const markdownBlockSessionService = {
  read(params: { hostId: string }): MarkdownCodeBlock | null {
    const { hostId } = params

    return blocksByHostId.get(hostId) ?? null
  },

  save(params: { block: MarkdownCodeBlock; hostId: string }): void {
    const { block, hostId } = params
    blocksByHostId.set(hostId, block)
  },
}
