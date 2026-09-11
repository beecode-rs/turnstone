import { type JSX, useEffect, useState } from 'react'
import { HelperText, TextInput } from 'react-native-paper'

import { usePlantumlServer } from '#src/ui-component/plantuml/plantuml-server-context'
import { constant } from '#src/util/constant'

export const PlantumlServerUrlInput = (): JSX.Element => {
  const { effectiveServerUrl, plantumlServer, savePlantumlServer } = usePlantumlServer()
  const [draftUrl, setDraftUrl] = useState(plantumlServer.customServerUrl)
  const [isDraftInvalid, setIsDraftInvalid] = useState(false)

  useEffect(() => {
    setDraftUrl(plantumlServer.customServerUrl)
    setIsDraftInvalid(false)
  }, [plantumlServer.customServerUrl])

  const resolveInputValue = (): string => {
    if (plantumlServer.isCustomServerEnabled) {
      return draftUrl
    }

    return effectiveServerUrl
  }

  const handleChangeText = (nextValue: string): void => {
    setDraftUrl(nextValue)
    const trimmedNextUrl = nextValue.trim()
    if (trimmedNextUrl === '' || !constant.plantumlServer.urlRegex.test(trimmedNextUrl)) {
      setIsDraftInvalid(true)

      return
    }
    setIsDraftInvalid(false)
    if (trimmedNextUrl === plantumlServer.customServerUrl) {
      return
    }

    void savePlantumlServer({ ...plantumlServer, customServerUrl: trimmedNextUrl })
  }

  return (
    <>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        disabled={!plantumlServer.isCustomServerEnabled}
        error={isDraftInvalid}
        keyboardType="url"
        label="Server URL"
        mode="outlined"
        onChangeText={handleChangeText}
        value={resolveInputValue()}
      />
      {isDraftInvalid && <HelperText type="error">Enter a valid http(s):// URL</HelperText>}
    </>
  )
}
