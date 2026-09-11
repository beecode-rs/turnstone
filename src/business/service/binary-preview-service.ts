import { BinaryPreviewKindMapper } from '#src/business/enum/binary-preview-kind-mapper-enum'
import { type SshTransport } from '#src/business/model/ssh-transport'
import { binaryPreviewUtil } from '#src/util/binary-preview-util'
import { constant } from '#src/util/constant'

export type BinaryPreviewPlanKind = Exclude<BinaryPreviewKindMapper, BinaryPreviewKindMapper.UNSUPPORTED>

export type BinaryPreviewPlan =
  | { kind: BinaryPreviewPlanKind; size: number; status: 'exceeds-cap' }
  | { kind: BinaryPreviewPlanKind; size: number; status: 'ready' }
  | { status: 'unsupported' }

export type BinaryPreviewChunk = {
  base64: string
  byteLength: number
  isFinal: boolean
  nextOffset: number
}

export type BinaryPreviewImageResult = {
  base64: string
  mimeType: string
}

export class BinaryPreviewService {
  plan(params: { fileName: string; isSvgPreviewDisabled?: boolean; size: number }): BinaryPreviewPlan {
    const { fileName, isSvgPreviewDisabled, size } = params
    const kind = binaryPreviewUtil.classify({ fileName, isSvgPreviewDisabled })
    if (kind === BinaryPreviewKindMapper.UNSUPPORTED) {
      return { status: 'unsupported' }
    }
    const isWithinCap = binaryPreviewUtil.resolveCapState({ size })
    if (!isWithinCap) {
      return { kind, size, status: 'exceeds-cap' }
    }

    return { kind, size, status: 'ready' }
  }

  async openPreview(params: {
    fileName: string
    isSvgPreviewDisabled?: boolean
    path: string
    transport: SshTransport
  }): Promise<BinaryPreviewPlan> {
    const { fileName, isSvgPreviewDisabled, path, transport } = params
    const statResult = await transport.stat({ path })

    return this.plan({
      fileName,
      isSvgPreviewDisabled,
      size: statResult.size,
    })
  }

  async readChunk(params: {
    offset: number
    path: string
    size: number
    transport: SshTransport
  }): Promise<BinaryPreviewChunk> {
    const { offset, path, size, transport } = params
    const readLength = Math.min(constant.binaryPreview.chunkBytes, size - offset)
    const chunk = await transport.readRange({ length: readLength, offset, path })
    const nextOffset = offset + chunk.bytesRead
    const isFinal = nextOffset >= size
    if (!isFinal && !binaryPreviewUtil.isBase64ConcatSafe({ byteLength: chunk.bytesRead })) {
      throw new Error('Binary preview chunk is not base64 concat safe')
    }

    return {
      base64: chunk.bytes.toString('base64'),
      byteLength: chunk.bytesRead,
      isFinal,
      nextOffset,
    }
  }

  async loadImagePreview(params: {
    fileName: string
    path: string
    size: number
    transport: SshTransport
  }): Promise<BinaryPreviewImageResult> {
    const { fileName, path, size, transport } = params
    const mimeType = binaryPreviewUtil.toMimeType({ fileName })
    if (mimeType === null) {
      throw new Error(`Binary preview mime type is unknown: ${fileName}`)
    }
    if (size === 0) {
      return { base64: '', mimeType }
    }
    const base64 = await this._readAllBase64({
      offset: 0,
      path,
      size,
      transport,
    })

    return { base64, mimeType }
  }

  protected async _readAllBase64(params: {
    offset: number
    path: string
    size: number
    transport: SshTransport
  }): Promise<string> {
    const { offset, path, size, transport } = params
    const chunk = await this.readChunk({
      offset,
      path,
      size,
      transport,
    })
    if (chunk.isFinal) {
      return chunk.base64
    }
    const remainingBase64 = await this._readAllBase64({
      offset: chunk.nextOffset,
      path,
      size,
      transport,
    })

    return chunk.base64 + remainingBase64
  }
}
