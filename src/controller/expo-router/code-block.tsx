import { router, useLocalSearchParams } from 'expo-router'
import { type JSX } from 'react'

import { markdownBlockSessionService } from '#src/business/service/markdown-block-session-service'
import { CodeBlockViewer } from '#src/ui-component/code-viewer/code-block-viewer'
import { CollapsibleTopBar } from '#src/ui-component/collapsible-top-bar'

export const CodeBlockController = (): JSX.Element => {
  const { host } = useLocalSearchParams<{ host: string }>()
  const block = markdownBlockSessionService.read({ hostId: host })

  const handleBack = (): void => {
    router.back()
  }

  const handlePressAbout = (): void => {
    router.navigate({ pathname: '/about' })
  }

  const handlePressSettings = (): void => {
    router.navigate({ pathname: '/settings' })
  }

  return (
    <>
      <CollapsibleTopBar
        onPressAbout={handlePressAbout}
        onPressBack={handleBack}
        onPressSettings={handlePressSettings}
        title="Code block"
      />
      <CodeBlockViewer block={block} />
    </>
  )
}
