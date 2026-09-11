import { Buffer } from 'buffer'

import { FileBomMapper } from '#src/business/enum/file-bom-mapper-enum'
import { FileEncodingMapper } from '#src/business/enum/file-encoding-mapper-enum'
import { constant } from '#src/util/constant'
import { lineSplitUtil } from '#src/util/line-split-util'

type ByteSequence = Uint8Array | number[]

export type FileDecodeBom = FileBomMapper | null

export const fileDecodeUtil = {
  _decodeLatin1Range(params: { bytes: ByteSequence; endIndex: number; startIndex: number }): string {
    const { bytes, endIndex, startIndex } = params
    const batchEndIndex = Math.min(endIndex, startIndex + constant.fileDecode.latin1BatchBytes)
    const headText = String.fromCharCode(...bytes.slice(startIndex, batchEndIndex))
    if (batchEndIndex >= endIndex) {
      return headText
    }

    return headText + fileDecodeUtil._decodeLatin1Range({ bytes, endIndex, startIndex: batchEndIndex })
  },

  _decodeTextChunk(params: {
    chunk: ByteSequence
    encoding: FileEncodingMapper
    isFinal: boolean
    pendingBytes: ByteSequence
  }): { pendingBytes: number[]; text: string } {
    const { chunk, encoding, isFinal, pendingBytes } = params
    const combinedBytes = [...Buffer.from(pendingBytes), ...Buffer.from(chunk)]
    const splitResult = lineSplitUtil.splitChunk({ chunk: combinedBytes, pendingTail: [] })
    const linesText = splitResult.lines
      .map((lineBytes) => {
        return `${fileDecodeUtil.decodeBytes({ bytes: lineBytes, encoding })}\n`
      })
      .join('')
    if (!isFinal) {
      return { pendingBytes: splitResult.pendingTail, text: linesText }
    }
    const flushedText = lineSplitUtil
      .flushLines({ pendingTail: splitResult.pendingTail })
      .lines.map((lineBytes) => {
        return fileDecodeUtil.decodeBytes({ bytes: lineBytes, encoding })
      })
      .join('')

    return { pendingBytes: [], text: linesText + flushedText }
  },

  _decodeUtf16Chunk(params: {
    chunk: ByteSequence
    encoding: FileEncodingMapper
    isFinal: boolean
    pendingBytes: ByteSequence
  }): { pendingBytes: number[]; text: string } {
    const { chunk, encoding, isFinal, pendingBytes } = params
    const combinedBytes = [...Buffer.from(pendingBytes), ...Buffer.from(chunk)]
    const isOddLength = combinedBytes.length % 2 === 1
    if (!isFinal && isOddLength) {
      return {
        pendingBytes: combinedBytes.slice(-1),
        text: fileDecodeUtil.decodeBytes({ bytes: combinedBytes.slice(0, -1), encoding }),
      }
    }

    return {
      pendingBytes: [],
      text: fileDecodeUtil.decodeBytes({ bytes: combinedBytes, encoding }),
    }
  },

  _startsWith(params: { bytes: number[]; prefixBytes: number[] }): boolean {
    const { bytes, prefixBytes } = params

    return prefixBytes.every((prefixByte, prefixIndex) => {
      return bytes[prefixIndex] === prefixByte
    })
  },

  decodeAllChunks(params: { chunks: number[][] }): string {
    const { chunks } = params
    if (chunks.length === 0) {
      return ''
    }
    const strippedFirstChunk = fileDecodeUtil.stripBom({ bytes: chunks[0] })
    const chunkBytes = [strippedFirstChunk.bytes, ...chunks.slice(1)]
    const encoding = fileDecodeUtil.resolveEncoding({
      bom: strippedFirstChunk.bom,
      bytes: strippedFirstChunk.bytes,
    })
    const decodedState = chunkBytes.reduce<{ pendingBytes: number[]; text: string }>(
      (accumulator, chunk, chunkIndex) => {
        const decodeResult = fileDecodeUtil.decodeChunk({
          chunk,
          encoding,
          isFinal: chunkIndex === chunkBytes.length - 1,
          pendingBytes: accumulator.pendingBytes,
        })

        return { pendingBytes: decodeResult.pendingBytes, text: accumulator.text + decodeResult.text }
      },
      { pendingBytes: [], text: '' },
    )

    return decodedState.text
  },

  decodeBytes(params: { bytes: ByteSequence; encoding: FileEncodingMapper }): string {
    const { bytes, encoding } = params
    switch (encoding) {
      case FileEncodingMapper.LATIN_1: {
        return fileDecodeUtil._decodeLatin1Range({
          bytes,
          endIndex: bytes.length,
          startIndex: 0,
        })
      }
      case FileEncodingMapper.UTF_16BE: {
        return new TextDecoder(FileEncodingMapper.UTF_16BE).decode(Buffer.from(bytes))
      }
      case FileEncodingMapper.UTF_16LE: {
        return new TextDecoder(FileEncodingMapper.UTF_16LE).decode(Buffer.from(bytes))
      }
      case FileEncodingMapper.UTF_8: {
        return new TextDecoder(FileEncodingMapper.UTF_8).decode(Buffer.from(bytes))
      }
      default: {
        throw new Error('Unsupported file encoding')
      }
    }
  },

  decodeChunk(params: {
    chunk: ByteSequence
    encoding: FileEncodingMapper
    isFinal: boolean
    pendingBytes: ByteSequence
  }): { pendingBytes: number[]; text: string } {
    const { chunk, encoding, isFinal, pendingBytes } = params
    if (encoding === FileEncodingMapper.UTF_16BE || encoding === FileEncodingMapper.UTF_16LE) {
      return fileDecodeUtil._decodeUtf16Chunk({ chunk, encoding, isFinal, pendingBytes })
    }

    return fileDecodeUtil._decodeTextChunk({ chunk, encoding, isFinal, pendingBytes })
  },

  detectBom(params: { bytes: ByteSequence }): FileDecodeBom {
    const { bytes } = params
    const allBytes = [...Buffer.from(bytes)]
    if (fileDecodeUtil._startsWith({ bytes: allBytes, prefixBytes: constant.fileDecode.bomBytes.utf8 })) {
      return FileBomMapper.UTF_8
    }
    if (fileDecodeUtil._startsWith({ bytes: allBytes, prefixBytes: constant.fileDecode.bomBytes.utf16le })) {
      return FileBomMapper.UTF_16LE
    }
    if (fileDecodeUtil._startsWith({ bytes: allBytes, prefixBytes: constant.fileDecode.bomBytes.utf16be })) {
      return FileBomMapper.UTF_16BE
    }

    return null
  },

  detectTextEncoding(params: { bytes: ByteSequence }): FileEncodingMapper {
    const { bytes } = params
    try {
      new TextDecoder(FileEncodingMapper.UTF_8, { fatal: true }).decode(Buffer.from(bytes))

      return FileEncodingMapper.UTF_8
    } catch {
      return FileEncodingMapper.LATIN_1
    }
  },

  resolveEncoding(params: { bom: FileDecodeBom; bytes: ByteSequence }): FileEncodingMapper {
    const { bom, bytes } = params
    if (bom === FileBomMapper.UTF_16BE) {
      return FileEncodingMapper.UTF_16BE
    }
    if (bom === FileBomMapper.UTF_16LE) {
      return FileEncodingMapper.UTF_16LE
    }
    const splitResult = lineSplitUtil.splitChunk({ chunk: bytes, pendingTail: [] })
    const detectionBytes = splitResult.lines.reduce<number[]>((accumulator, lineBytes) => {
      return accumulator.concat(lineBytes)
    }, [])

    return fileDecodeUtil.detectTextEncoding({ bytes: detectionBytes })
  },

  sniffBinary(params: { bytes: ByteSequence }): boolean {
    const { bytes } = params
    const sniffEndIndex = Math.min(bytes.length, constant.fileDecode.binarySniffWindowBytes)

    return bytes.slice(0, sniffEndIndex).includes(0)
  },

  stripBom(params: { bytes: ByteSequence }): { bom: FileDecodeBom; bytes: number[] } {
    const { bytes } = params
    const bom = fileDecodeUtil.detectBom({ bytes })
    const allBytes = [...Buffer.from(bytes)]
    if (bom === FileBomMapper.UTF_8) {
      return { bom, bytes: allBytes.slice(3) }
    }
    if (bom === null) {
      return { bom, bytes: allBytes }
    }

    return { bom, bytes: allBytes.slice(2) }
  },
}
