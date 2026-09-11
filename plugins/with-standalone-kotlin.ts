import { type ConfigPlugin, withGradleProperties } from 'expo/config-plugins'

// TODO: Remove when the expo prebuild template supports the RN 0.87 Android toolchain (AGP 9)
const PROPERTIES = [
  { key: 'android.builtInKotlin', value: 'false' },
  { key: 'android.newDsl', value: 'false' },
]

const withStandaloneKotlin: ConfigPlugin = (config) => {
  return withGradleProperties(config, (mod) => {
    PROPERTIES.forEach(({ key, value }) => {
      const hasProperty = mod.modResults.some((entry) => {
        return entry.type === 'property' && entry.key === key
      })

      if (!hasProperty) {
        mod.modResults.push({ type: 'property', key, value })
      }
    })

    return mod
  })
}

export default withStandaloneKotlin
