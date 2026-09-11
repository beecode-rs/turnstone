import { BinaryPreviewKindMapper } from '#src/business/enum/binary-preview-kind-mapper-enum'
import { constant } from '#src/util/constant'

const EXTENSION_PREVIEW_KIND_MAP = new Map<string, BinaryPreviewKindMapper>([
  ['bmp', BinaryPreviewKindMapper.IMAGE],
  ['gif', BinaryPreviewKindMapper.IMAGE],
  ['ico', BinaryPreviewKindMapper.ICON],
  ['jpeg', BinaryPreviewKindMapper.IMAGE],
  ['jpg', BinaryPreviewKindMapper.IMAGE],
  ['pdf', BinaryPreviewKindMapper.PDF],
  ['png', BinaryPreviewKindMapper.IMAGE],
  ['svg', BinaryPreviewKindMapper.SVG],
  ['webp', BinaryPreviewKindMapper.IMAGE],
])

const EXTENSION_MIME_TYPE_MAP = new Map<string, string>([
  ['bmp', 'image/bmp'],
  ['gif', 'image/gif'],
  ['ico', 'image/x-icon'],
  ['jpeg', 'image/jpeg'],
  ['jpg', 'image/jpeg'],
  ['pdf', 'application/pdf'],
  ['png', 'image/png'],
  ['svg', 'image/svg+xml'],
  ['webp', 'image/webp'],
])

const FALLBACK_ASPECT = 4 / 3

export const binaryPreviewUtil = {
  _toBaseName(params: { fileName: string }): string {
    const { fileName } = params
    const segments = fileName.split('/')
    const lastSegment = segments[segments.length - 1]
    if (lastSegment === '') {
      return fileName
    }

    return lastSegment
  },
  _toExtension(params: { fileName: string }): string | null {
    const { fileName } = params
    const baseName = binaryPreviewUtil._toBaseName({ fileName }).toLowerCase()
    const lastDotIndex = baseName.lastIndexOf('.')
    if (lastDotIndex <= 0) {
      return null
    }

    return baseName.slice(lastDotIndex + 1)
  },
  classify(params: { fileName: string; isSvgPreviewDisabled?: boolean }): BinaryPreviewKindMapper {
    const { fileName, isSvgPreviewDisabled } = params
    const extension = binaryPreviewUtil._toExtension({ fileName })
    if (extension === null) {
      return BinaryPreviewKindMapper.UNSUPPORTED
    }
    const previewKind = EXTENSION_PREVIEW_KIND_MAP.get(extension)
    if (previewKind === undefined) {
      return BinaryPreviewKindMapper.UNSUPPORTED
    }
    if (previewKind === BinaryPreviewKindMapper.SVG && isSvgPreviewDisabled === true) {
      return BinaryPreviewKindMapper.UNSUPPORTED
    }

    return previewKind
  },
  isBase64ConcatSafe(params: { byteLength: number }): boolean {
    const { byteLength } = params

    return byteLength % 3 === 0
  },
  resolveAspect(params: { sourceHeight?: number; sourceWidth?: number }): number {
    const { sourceHeight, sourceWidth } = params
    if (typeof sourceWidth !== 'number' || typeof sourceHeight !== 'number') {
      return FALLBACK_ASPECT
    }
    if (sourceWidth <= 0 || sourceHeight <= 0) {
      return FALLBACK_ASPECT
    }

    return sourceWidth / sourceHeight
  },
  resolveCapState(params: { size: number }): boolean {
    const { size } = params

    return size <= constant.binaryPreview.capBytes
  },
  toDataUri(params: { base64: string; mimeType: string }): string {
    const { base64, mimeType } = params

    return `data:${mimeType};base64,${base64}`
  },
  toMimeType(params: { fileName: string }): string | null {
    const { fileName } = params
    const extension = binaryPreviewUtil._toExtension({ fileName })
    if (extension === null) {
      return null
    }

    return EXTENSION_MIME_TYPE_MAP.get(extension) ?? null
  },
}
