import { OpenFileKindMapper } from '#src/business/enum/open-file-kind-mapper-enum'
import { remotePathUtil } from '#src/util/remote-path-util'

export type OpenScreensState = {
  activeFilePath: string | null
  isDrawerOpen: boolean
  openFilePaths: string[]
}

export const OPEN_SCREENS_INITIAL_STATE: OpenScreensState = {
  activeFilePath: null,
  isDrawerOpen: false,
  openFilePaths: [],
}

export const openScreensUtil = {
  activateFile(params: { path: string | null; state: OpenScreensState }): OpenScreensState {
    const { path, state } = params
    if (path !== null && !state.openFilePaths.includes(path)) {
      return state
    }

    return { ...state, activeFilePath: path }
  },

  closeDrawer(params: { state: OpenScreensState }): OpenScreensState {
    const { state } = params
    if (!state.isDrawerOpen) {
      return state
    }

    return { ...state, isDrawerOpen: false }
  },

  closeFile(params: { path: string; state: OpenScreensState }): OpenScreensState {
    const { path, state } = params
    if (!state.openFilePaths.includes(path)) {
      return state
    }
    const openFilePaths = state.openFilePaths.filter((openFilePath) => {
      return openFilePath !== path
    })
    if (state.activeFilePath !== path) {
      return { ...state, openFilePaths }
    }

    return { ...state, activeFilePath: openFilePaths.at(-1) ?? null, openFilePaths }
  },

  openDrawer(params: { state: OpenScreensState }): OpenScreensState {
    const { state } = params
    if (state.isDrawerOpen) {
      return state
    }

    return { ...state, isDrawerOpen: true }
  },

  openFile(params: { path: string; state: OpenScreensState }): OpenScreensState {
    const { path, state } = params
    const openFilePaths = [
      ...state.openFilePaths.filter((openFilePath) => {
        return openFilePath !== path
      }),
      path,
    ]

    return { ...state, activeFilePath: path, openFilePaths }
  },

  resolveKind(params: { path: string }): OpenFileKindMapper {
    const { path } = params
    const fileName = remotePathUtil.toParts({ path }).at(-1) ?? ''
    const loweredFileName = fileName.toLowerCase()
    if (loweredFileName.endsWith('.md') || loweredFileName.endsWith('.markdown')) {
      return OpenFileKindMapper.MARKDOWN
    }
    if (loweredFileName.endsWith('.html') || loweredFileName.endsWith('.htm')) {
      return OpenFileKindMapper.HTML
    }
    if (loweredFileName.endsWith('.mermaid') || loweredFileName.endsWith('.mmd')) {
      return OpenFileKindMapper.MERMAID
    }
    if (loweredFileName.endsWith('.plantuml') || loweredFileName.endsWith('.pu') || loweredFileName.endsWith('.puml')) {
      return OpenFileKindMapper.PLANTUML
    }

    return OpenFileKindMapper.FILE
  },

  restoreFiles(params: { record: { activeFilePath: string | null; openFilePaths: string[] } }): OpenScreensState {
    const { record } = params

    return {
      activeFilePath: record.activeFilePath,
      isDrawerOpen: false,
      openFilePaths: record.openFilePaths,
    }
  },

  toRecord(params: { state: OpenScreensState }): { activeFilePath: string | null; openFilePaths: string[] } {
    const { state } = params

    return {
      activeFilePath: state.activeFilePath,
      openFilePaths: state.openFilePaths,
    }
  },
}
