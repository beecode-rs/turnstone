import AsyncStorage from '@react-native-async-storage/async-storage'

import { type AlwaysOpenDrawerPreferenceStorage } from '#src/business/model/always-open-drawer-preference'
import { type BiometricLockPreferenceStorage } from '#src/business/model/biometric-lock-preference'
import { type DisplayCutoutPreferenceStorage } from '#src/business/model/display-cutout-preference'
import { type DotFilesPreferenceStorage } from '#src/business/model/dot-files-preference'
import { type FabOpacityPreferenceStorage } from '#src/business/model/fab-opacity-preference'
import { type FileNestingPreferenceStorage } from '#src/business/model/file-nesting-preference'
import { type FontSizePreferenceStorage } from '#src/business/model/font-size-preference'
import { type FooterPreferenceStorage } from '#src/business/model/footer-preference'
import { type IgnoredFilesPreferenceStorage } from '#src/business/model/ignored-files-preference'
import { type LineNumbersPreferenceStorage } from '#src/business/model/line-numbers-preference'
import { type PlantumlServerPreferenceStorage } from '#src/business/model/plantuml-server-preference'
import { type SearchIgnoredFilesPreferenceStorage } from '#src/business/model/search-ignored-files-preference'
import { type ThemePreferenceStorage } from '#src/business/model/theme-preference'
import { type TreeDensityPreferenceStorage } from '#src/business/model/tree-density-preference'
import { type ViewMarginPreferenceStorage } from '#src/business/model/view-margin-preference'
import { type WordWrapPreferenceStorage } from '#src/business/model/word-wrap-preference'
import { constant } from '#src/util/constant'

export const alwaysOpenDrawerPreferenceStorage: AlwaysOpenDrawerPreferenceStorage = {
  readPreference: () => {
    return AsyncStorage.getItem(constant.preferenceStorageKey.alwaysOpenDrawer)
  },
  writePreference: (params) => {
    const { value } = params

    return AsyncStorage.setItem(constant.preferenceStorageKey.alwaysOpenDrawer, value)
  },
}

export const biometricLockPreferenceStorage: BiometricLockPreferenceStorage = {
  readPreference: () => {
    return AsyncStorage.getItem(constant.preferenceStorageKey.biometricLock)
  },
  writePreference: (params) => {
    const { value } = params

    return AsyncStorage.setItem(constant.preferenceStorageKey.biometricLock, value)
  },
}

export const themePreferenceStorage: ThemePreferenceStorage = {
  readPreference: () => {
    return AsyncStorage.getItem(constant.preferenceStorageKey.theme)
  },
  writePreference: (params) => {
    const { value } = params

    return AsyncStorage.setItem(constant.preferenceStorageKey.theme, value)
  },
}

export const treeDensityPreferenceStorage: TreeDensityPreferenceStorage = {
  readPreference: () => {
    return AsyncStorage.getItem(constant.preferenceStorageKey.treeDensity)
  },
  writePreference: (params) => {
    const { value } = params

    return AsyncStorage.setItem(constant.preferenceStorageKey.treeDensity, value)
  },
}

export const displayCutoutPreferenceStorage: DisplayCutoutPreferenceStorage = {
  readPreference: () => {
    return AsyncStorage.getItem(constant.preferenceStorageKey.displayCutout)
  },
  writePreference: (params) => {
    const { value } = params

    return AsyncStorage.setItem(constant.preferenceStorageKey.displayCutout, value)
  },
}

export const dotFilesPreferenceStorage: DotFilesPreferenceStorage = {
  readPreference: () => {
    return AsyncStorage.getItem(constant.preferenceStorageKey.dotFiles)
  },
  writePreference: (params) => {
    const { value } = params

    return AsyncStorage.setItem(constant.preferenceStorageKey.dotFiles, value)
  },
}

export const fabOpacityPreferenceStorage: FabOpacityPreferenceStorage = {
  readPreference: () => {
    return AsyncStorage.getItem(constant.preferenceStorageKey.fabOpacity)
  },
  writePreference: (params) => {
    const { value } = params

    return AsyncStorage.setItem(constant.preferenceStorageKey.fabOpacity, value)
  },
}

export const fileNestingPreferenceStorage: FileNestingPreferenceStorage = {
  readPreference: () => {
    return AsyncStorage.getItem(constant.preferenceStorageKey.fileNesting)
  },
  writePreference: (params) => {
    const { value } = params

    return AsyncStorage.setItem(constant.preferenceStorageKey.fileNesting, value)
  },
}

export const fontSizePreferenceStorage: FontSizePreferenceStorage = {
  readPreference: () => {
    return AsyncStorage.getItem(constant.preferenceStorageKey.fontSize)
  },
  writePreference: (params) => {
    const { value } = params

    return AsyncStorage.setItem(constant.preferenceStorageKey.fontSize, value)
  },
}

export const footerPreferenceStorage: FooterPreferenceStorage = {
  readPreference: () => {
    return AsyncStorage.getItem(constant.preferenceStorageKey.footer)
  },
  writePreference: (params) => {
    const { value } = params

    return AsyncStorage.setItem(constant.preferenceStorageKey.footer, value)
  },
}

export const ignoredFilesPreferenceStorage: IgnoredFilesPreferenceStorage = {
  readPreference: () => {
    return AsyncStorage.getItem(constant.preferenceStorageKey.ignoredFiles)
  },
  writePreference: (params) => {
    const { value } = params

    return AsyncStorage.setItem(constant.preferenceStorageKey.ignoredFiles, value)
  },
}

export const lineNumbersPreferenceStorage: LineNumbersPreferenceStorage = {
  readPreference: () => {
    return AsyncStorage.getItem(constant.preferenceStorageKey.lineNumbers)
  },
  writePreference: (params) => {
    const { value } = params

    return AsyncStorage.setItem(constant.preferenceStorageKey.lineNumbers, value)
  },
}

export const plantumlServerPreferenceStorage: PlantumlServerPreferenceStorage = {
  readPreference: () => {
    return AsyncStorage.getItem(constant.plantumlServer.storageKey)
  },
  writePreference: (params) => {
    const { value } = params

    return AsyncStorage.setItem(constant.plantumlServer.storageKey, value)
  },
}

export const searchIgnoredFilesPreferenceStorage: SearchIgnoredFilesPreferenceStorage = {
  readPreference: () => {
    return AsyncStorage.getItem(constant.preferenceStorageKey.searchIgnoredFiles)
  },
  writePreference: (params) => {
    const { value } = params

    return AsyncStorage.setItem(constant.preferenceStorageKey.searchIgnoredFiles, value)
  },
}

export const viewMarginPreferenceStorage: ViewMarginPreferenceStorage = {
  readPreference: () => {
    return AsyncStorage.getItem(constant.preferenceStorageKey.viewMargin)
  },
  writePreference: (params) => {
    const { value } = params

    return AsyncStorage.setItem(constant.preferenceStorageKey.viewMargin, value)
  },
}

export const wordWrapPreferenceStorage: WordWrapPreferenceStorage = {
  readPreference: () => {
    return AsyncStorage.getItem(constant.preferenceStorageKey.wordWrap)
  },
  writePreference: (params) => {
    const { value } = params

    return AsyncStorage.setItem(constant.preferenceStorageKey.wordWrap, value)
  },
}
