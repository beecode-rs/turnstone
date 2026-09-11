import { appMmkv } from '#src/lib/mmkv'
import { constant } from '#src/util/constant'

export class ActiveProjectDal {
  read(params: { hostId: string }): string | null {
    const { hostId } = params
    const projectId = appMmkv.getString(this._buildKey({ hostId }))

    return projectId ?? null
  }

  write(params: { hostId: string; projectId: string }): void {
    const { hostId, projectId } = params
    appMmkv.set(this._buildKey({ hostId }), projectId)
  }

  remove(params: { hostId: string }): void {
    const { hostId } = params
    appMmkv.remove(this._buildKey({ hostId }))
  }

  protected _buildKey(params: { hostId: string }): string {
    const { hostId } = params

    return `${constant.activeProject.storageKeyPrefix}${hostId}`
  }
}
