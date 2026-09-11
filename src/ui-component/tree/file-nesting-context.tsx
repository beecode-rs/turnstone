import { type JSX, type ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react'

import { type FileNestingPreference } from '#src/business/model/file-nesting-preference'
import { FileNestingPreferenceService } from '#src/business/service/file-nesting-preference-service'
import { fileNestingPreferenceStorage } from '#src/lib/async-storage'
import { constant } from '#src/util/constant'

interface FileNestingContextValue {
  fileNesting: FileNestingPreference
  saveFileNesting: (fileNesting: FileNestingPreference) => Promise<void>
}

const FileNestingContext = createContext<FileNestingContextValue | undefined>(undefined)

export const FileNestingProvider = (props: { children: ReactNode }): JSX.Element => {
  const [fileNesting, setFileNesting] = useState<FileNestingPreference>(constant.fileNesting.defaultPreference)
  const fileNestingPreferenceService = useMemo(() => {
    return new FileNestingPreferenceService()
  }, [])

  useEffect(() => {
    void fileNestingPreferenceService
      .loadPreference({ storage: fileNestingPreferenceStorage })
      .then((loadedPreference) => {
        setFileNesting(loadedPreference)
      })
  }, [fileNestingPreferenceService])

  const contextValue = useMemo(() => {
    return {
      fileNesting,
      saveFileNesting: (nextFileNesting: FileNestingPreference) => {
        return fileNestingPreferenceService
          .savePreference({ preference: nextFileNesting, storage: fileNestingPreferenceStorage })
          .then(() => {
            setFileNesting(nextFileNesting)
          })
      },
    }
  }, [fileNesting, fileNestingPreferenceService])

  return <FileNestingContext.Provider value={contextValue}>{props.children}</FileNestingContext.Provider>
}

export const useFileNesting = (): FileNestingContextValue => {
  const contextValue = useContext(FileNestingContext)

  if (!contextValue) {
    throw new Error('useFileNesting requires FileNestingProvider')
  }

  return contextValue
}
