import { BinaryPreviewKindMapper } from '#src/business/enum/binary-preview-kind-mapper-enum'
import { type SshTransport } from '#src/business/model/ssh-transport'
import { BinaryPreviewService } from '#src/business/service/binary-preview-service'
import { binaryPreviewUtil } from '#src/util/binary-preview-util'
import { remotePathUtil } from '#src/util/remote-path-util'

export class MarkdownImageService {
  async loadDataUri(params: { markdownPath: string; src: string; transport: SshTransport }): Promise<string | null> {
    const { markdownPath, src, transport } = params
    const remotePath = remotePathUtil.resolveFromFile({ fromFilePath: markdownPath, targetPath: src })
    const statResult = await transport.stat({ path: remotePath })
    const previewService = new BinaryPreviewService()
    const plan = previewService.plan({ fileName: remotePath, size: statResult.size })
    if (plan.status !== 'ready') {
      return null
    }
    if (plan.kind !== BinaryPreviewKindMapper.IMAGE && plan.kind !== BinaryPreviewKindMapper.ICON) {
      return null
    }
    const image = await previewService.loadImagePreview({
      fileName: remotePath,
      path: remotePath,
      size: statResult.size,
      transport,
    })

    return binaryPreviewUtil.toDataUri(image)
  }
}
