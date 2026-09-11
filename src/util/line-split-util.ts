import { Buffer } from 'buffer'

import { constant } from '#src/util/constant'

type ByteSequence = Uint8Array | number[]

interface LineSplitState {
  currentLine: number[]
  lines: number[][]
}

export const lineSplitUtil = {
  flushLines(params: { pendingTail: ByteSequence }): { lines: number[][] } {
    const { pendingTail } = params
    const tailBytes = [...Buffer.from(pendingTail)]
    if (tailBytes.length === 0) {
      return { lines: [] }
    }

    return { lines: [tailBytes] }
  },

  splitChunk(params: { chunk: ByteSequence; pendingTail: ByteSequence }): { lines: number[][]; pendingTail: number[] } {
    const { chunk, pendingTail } = params
    const combinedBytes = [...Buffer.from(pendingTail), ...Buffer.from(chunk)]
    const splitState = combinedBytes.reduce<LineSplitState>(
      (accumulator, byte) => {
        if (byte === constant.lineSplit.lineFeedByte) {
          accumulator.lines.push(accumulator.currentLine)

          return { currentLine: [], lines: accumulator.lines }
        }
        accumulator.currentLine.push(byte)

        return accumulator
      },
      { currentLine: [], lines: [] },
    )

    return { lines: splitState.lines, pendingTail: splitState.currentLine }
  },
}
