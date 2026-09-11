import { GitDiffLayoutMapper } from '#src/business/enum/git-diff-layout-mapper-enum'
import { appMmkv } from '#src/lib/mmkv'
import { constant } from '#src/util/constant'

export class DiffLayoutDal {
  read(): GitDiffLayoutMapper | null {
    const value = appMmkv.getString(constant.diffLayout.storageKey)
    if (value === GitDiffLayoutMapper.SPLIT || value === GitDiffLayoutMapper.UNIFIED) {
      return value
    }

    return null
  }

  write(params: { layout: GitDiffLayoutMapper }): void {
    const { layout } = params
    appMmkv.set(constant.diffLayout.storageKey, layout)
  }
}
