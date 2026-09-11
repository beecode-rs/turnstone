import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert } from 'react-native'

import { FileCapReachedError, type FileReadState } from '#src/business/model/file-content'
import { type SshTransport } from '#src/business/model/ssh-transport'
import { FileReadService } from '#src/business/service/file-read-service'
import { serverConnectUseCase } from '#src/business/use-case/server-connect-use-case'

type RemoteFileText = {
  binarySize: number | null
  isTruncated: boolean
  text: string
}

export type RemoteFileTextResult = RemoteFileText & { isLoading: boolean }

const INITIAL_FILE_TEXT: RemoteFileText = {
  binarySize: null,
  isTruncated: false,
  text: '',
}

export const useRemoteFileText = (props: {
  hostId: string
  path: string
  refreshToken?: number
}): RemoteFileTextResult => {
  const [isLoading, setIsLoading] = useState(true)
  const [loadResult, setLoadResult] = useState<RemoteFileText>(INITIAL_FILE_TEXT)
  const loadedFileKeyRef = useRef<string | null>(null)
  const fileReadService = useMemo(() => {
    return new FileReadService()
  }, [])

  useEffect(() => {
    const cancelState = { isCancelled: false }

    const loadChunks = (params: {
      accumulated: string
      state: FileReadState
      transport: SshTransport
    }): Promise<RemoteFileText> => {
      return fileReadService
        .loadMore({ state: params.state, transport: params.transport })
        .then((result) => {
          if (result.content.isBinary) {
            return { binarySize: 0, isTruncated: false, text: '' }
          }
          const text = params.accumulated + result.content.text
          if (result.state === null || result.content.isCapReached) {
            return { binarySize: null, isTruncated: result.content.isCapReached, text }
          }

          return loadChunks({ accumulated: text, state: result.state, transport: params.transport })
        })
        .catch((error: unknown) => {
          if (error instanceof FileCapReachedError) {
            return { binarySize: null, isTruncated: true, text: params.accumulated }
          }
          throw error
        })
    }

    const fileKey = `${props.hostId}:${props.path}`
    const isSameFile = loadedFileKeyRef.current === fileKey
    loadedFileKeyRef.current = fileKey

    setIsLoading(true)
    if (!isSameFile) {
      setLoadResult(INITIAL_FILE_TEXT)
    }
    void serverConnectUseCase
      .getTransport({ hostId: props.hostId })
      .then((transport) => {
        return fileReadService.openFile({ path: props.path, transport }).then((result) => {
          if (result.content.isBinary) {
            return { binarySize: result.content.size, isTruncated: false, text: '' }
          }
          if (result.state === null) {
            return { binarySize: null, isTruncated: false, text: result.content.text }
          }

          return loadChunks({
            accumulated: result.content.text,
            state: result.state,
            transport,
          })
        })
      })
      .then((result) => {
        if (cancelState.isCancelled) {
          return
        }
        setLoadResult(result)
      })
      .catch((error: unknown) => {
        if (cancelState.isCancelled) {
          return
        }
        Alert.alert('Open failed', `${props.path}\n${String(error)}`)
      })
      .finally(() => {
        if (cancelState.isCancelled) {
          return
        }
        setIsLoading(false)
      })

    return () => {
      cancelState.isCancelled = true
    }
  }, [fileReadService, props.hostId, props.path, props.refreshToken])

  return { ...loadResult, isLoading }
}
