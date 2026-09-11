import * as SplashScreen from 'expo-splash-screen'
import { type JSX, useEffect, useState } from 'react'

import { appBoot } from '#src/app-boot/boot'
import { RootShell } from '#src/controller/expo-router/root-shell'

void SplashScreen.preventAutoHideAsync()

export default function RootLayout(): JSX.Element | null {
  const [hasFontsLoaded, setHasFontsLoaded] = useState(false)

  useEffect(() => {
    void appBoot.loadFonts().finally(() => {
      setHasFontsLoaded(true)
    })
  }, [])

  if (!hasFontsLoaded) {
    return null
  }

  return <RootShell />
}
