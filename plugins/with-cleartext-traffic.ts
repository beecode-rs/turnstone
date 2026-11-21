import { AndroidConfig, type ConfigPlugin, withAndroidManifest } from 'expo/config-plugins'

const withCleartextTraffic: ConfigPlugin = (config) => {
  return withAndroidManifest(config, (mod) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults)
    application.$['android:usesCleartextTraffic'] = 'true'

    return mod
  })
}

export default withCleartextTraffic
