import { GitDiffLayoutMapper } from '#src/business/enum/git-diff-layout-mapper-enum'
import { GitDiffScopeMapper } from '#src/business/enum/git-diff-scope-mapper-enum'
import { DiffLayoutDal } from '#src/dal/mmkv/diff-layout-dal'
import { DiffScopeDal } from '#src/dal/mmkv/diff-scope-dal'

const diffLayoutDal = new DiffLayoutDal()
const diffScopeDal = new DiffScopeDal()

export const gitScreenUseCase = {
  loadDiffLayout: (): GitDiffLayoutMapper => {
    return diffLayoutDal.read() ?? GitDiffLayoutMapper.UNIFIED
  },

  loadDiffScope: (): GitDiffScopeMapper => {
    return diffScopeDal.read() ?? GitDiffScopeMapper.CHANGES
  },

  persistDiffLayout: (params: { layout: GitDiffLayoutMapper }): void => {
    diffLayoutDal.write({ layout: params.layout })
  },

  persistDiffScope: (params: { scope: GitDiffScopeMapper }): void => {
    diffScopeDal.write({ scope: params.scope })
  },
}
