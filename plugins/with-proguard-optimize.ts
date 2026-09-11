import { type ConfigPlugin, withAppBuildGradle } from 'expo/config-plugins'

// TODO: Remove when the expo prebuild template targets AGP 9 (proguard-android.txt was removed)
const LEGACY_PROGUARD_MARKER = 'getDefaultProguardFile("proguard-android.txt")'

const withProguardOptimize: ConfigPlugin = (config) => {
  return withAppBuildGradle(config, (mod) => {
    const contents = mod.modResults.contents
    mod.modResults.contents = contents.replace(
      LEGACY_PROGUARD_MARKER,
      'getDefaultProguardFile("proguard-android-optimize.txt")',
    )

    return mod
  })
}

export default withProguardOptimize
