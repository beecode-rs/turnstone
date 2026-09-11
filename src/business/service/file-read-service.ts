import { FileBomMapper } from '#src/business/enum/file-bom-mapper-enum'
import { FileEncodingMapper } from '#src/business/enum/file-encoding-mapper-enum'
import {
  FileCapReachedError,
  type FileOpenResult,
  type FileReadState,
  type TextFileContent,
} from '#src/business/model/file-content'
import { type SshTransport } from '#src/business/model/ssh-transport'
import { constant } from '#src/util/constant'
import { fileDecodeUtil } from '#src/util/file-decode-util'

export class FileReadService {
  async loadMore(params: { state: FileReadState; transport: SshTransport }): Promise<FileOpenResult> {
    const { state, transport } = params
    if (state.offset >= constant.fileRead.maxOnDemandBytes) {
      throw new FileCapReachedError()
    }
    const remainingBytes = state.size - state.offset
    const remainingToCapBytes = constant.fileRead.maxOnDemandBytes - state.offset
    const readLength = Math.min(constant.fileRead.chunkBytes, remainingBytes, remainingToCapBytes)
    const chunk = await transport.readRange({
      length: readLength,
      offset: state.offset,
      path: state.path,
    })
    const offset = state.offset + chunk.bytesRead
    const decodeResult = fileDecodeUtil.decodeChunk({
      chunk: chunk.bytes,
      encoding: state.encoding,
      isFinal: offset >= state.size,
      pendingBytes: state.pendingBytes,
    })

    return this._buildResult({
      encoding: state.encoding,
      offset,
      path: state.path,
      pendingBytes: decodeResult.pendingBytes,
      size: state.size,
      text: decodeResult.text,
    })
  }

  async openFile(params: { path: string; size?: number; transport: SshTransport }): Promise<FileOpenResult> {
    const { path, size, transport } = params
    const resolvedSize = await this._resolveSize({ path, size, transport })
    if (resolvedSize === 0) {
      return this._buildResult({
        encoding: FileEncodingMapper.UTF_8,
        offset: 0,
        path,
        pendingBytes: [],
        size: resolvedSize,
        text: '',
      })
    }
    const readLength = Math.min(constant.fileRead.chunkBytes, resolvedSize)
    const chunk = await transport.readRange({ length: readLength, offset: 0, path })
    const stripResult = fileDecodeUtil.stripBom({ bytes: chunk.bytes })
    if (stripResult.bom === FileBomMapper.UTF_16BE || stripResult.bom === FileBomMapper.UTF_16LE) {
      return this._decodeChunkToResult({
        chunkBytes: stripResult.bytes,
        encoding: this._toEncoding({ bom: stripResult.bom }),
        offset: chunk.bytesRead,
        path,
        size: resolvedSize,
      })
    }
    if (fileDecodeUtil.sniffBinary({ bytes: stripResult.bytes })) {
      return { content: { isBinary: true, size: resolvedSize }, state: null }
    }

    return this._decodeChunkToResult({
      chunkBytes: stripResult.bytes,
      encoding: fileDecodeUtil.resolveEncoding({ bom: stripResult.bom, bytes: stripResult.bytes }),
      offset: chunk.bytesRead,
      path,
      size: resolvedSize,
    })
  }

  protected _buildResult(params: {
    encoding: FileEncodingMapper
    offset: number
    path: string
    pendingBytes: number[]
    size: number
    text: string
  }): FileOpenResult {
    const { encoding, offset, path, pendingBytes, size, text } = params
    const hasMore = offset < size
    const content: TextFileContent = {
      encoding,
      hasMore,
      isBinary: false,
      isCapReached: hasMore && offset >= constant.fileRead.maxOnDemandBytes,
      loadedBytes: offset,
      size,
      text,
    }
    if (!hasMore) {
      return { content, state: null }
    }

    return {
      content,
      state: {
        encoding,
        offset,
        path,
        pendingBytes,
        size,
      },
    }
  }

  protected _decodeChunkToResult(params: {
    chunkBytes: number[] | Uint8Array
    encoding: FileEncodingMapper
    offset: number
    path: string
    size: number
  }): FileOpenResult {
    const { chunkBytes, encoding, offset, path, size } = params
    const decodeResult = fileDecodeUtil.decodeChunk({
      chunk: chunkBytes,
      encoding,
      isFinal: offset >= size,
      pendingBytes: [],
    })

    return this._buildResult({
      encoding,
      offset,
      path,
      pendingBytes: decodeResult.pendingBytes,
      size,
      text: decodeResult.text,
    })
  }

  protected _toEncoding(params: { bom: FileBomMapper }): FileEncodingMapper {
    const { bom } = params
    switch (bom) {
      case FileBomMapper.UTF_16BE: {
        return FileEncodingMapper.UTF_16BE
      }
      case FileBomMapper.UTF_16LE: {
        return FileEncodingMapper.UTF_16LE
      }
      default: {
        return FileEncodingMapper.UTF_8
      }
    }
  }

  protected async _resolveSize(params: { path: string; size?: number; transport: SshTransport }): Promise<number> {
    const { path, size, transport } = params
    if (size !== undefined) {
      return size
    }
    const statResult = await transport.stat({ path })

    return statResult.size
  }
}
