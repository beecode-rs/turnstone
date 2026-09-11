import {
  DEFAULT_FILE_ICON,
  DEFAULT_FOLDER_EXPANDED_ICON,
  DEFAULT_FOLDER_ICON,
  FILE_EXTENSIONS,
  FILE_NAMES,
  FOLDER_NAMES,
  FOLDER_NAMES_EXPANDED,
  type FileIconKey,
} from '#src/asset/file-icons/file-icons.gen'

export const fileIconUtil = {
  _resolveExtensionIcon(params: { name: string }): FileIconKey | undefined {
    const { name } = params
    const extensionCandidates = [...name.matchAll(/\./g)]
      .filter((match) => {
        return match.index > 0
      })
      .map((match) => {
        return name.slice(match.index + 1)
      })
    const candidateIcons = extensionCandidates.map((candidate) => {
      return FILE_EXTENSIONS[candidate]
    })

    return candidateIcons.find((icon) => {
      return icon !== undefined
    })
  },

  _resolveFileIcon(params: { name: string }): FileIconKey {
    const { name } = params
    const lowerName = name.toLowerCase()

    return FILE_NAMES[lowerName] ?? fileIconUtil._resolveExtensionIcon({ name: lowerName }) ?? DEFAULT_FILE_ICON
  },

  _resolveFolderIcon(params: { isExpanded: boolean; name: string }): FileIconKey {
    const { isExpanded, name } = params
    const lowerName = name.toLowerCase()
    if (isExpanded) {
      return FOLDER_NAMES_EXPANDED[lowerName] ?? FOLDER_NAMES[lowerName] ?? DEFAULT_FOLDER_EXPANDED_ICON
    }

    return FOLDER_NAMES[lowerName] ?? DEFAULT_FOLDER_ICON
  },

  resolveFileIcon(params: { isDir: boolean; isExpanded?: boolean; name: string }): FileIconKey {
    const { isDir, isExpanded, name } = params
    if (isDir) {
      return fileIconUtil._resolveFolderIcon({ isExpanded: isExpanded === true, name })
    }

    return fileIconUtil._resolveFileIcon({ name })
  },
}
