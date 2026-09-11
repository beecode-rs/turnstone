import { GitDiffScopeMapper } from '#src/business/enum/git-diff-scope-mapper-enum'
import { appMmkv } from '#src/lib/mmkv'
import { constant } from '#src/util/constant'

export class DiffScopeDal {
  read(): GitDiffScopeMapper | null {
    const value = appMmkv.getString(constant.diffScope.storageKey)
    if (value === GitDiffScopeMapper.CHANGES || value === GitDiffScopeMapper.FULL) {
      return value
    }

    return null
  }

  write(params: { scope: GitDiffScopeMapper }): void {
    const { scope } = params
    appMmkv.set(constant.diffScope.storageKey, scope)
  }
}
