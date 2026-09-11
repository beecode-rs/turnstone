import { type ConfigPlugin, withProjectBuildGradle } from 'expo/config-plugins'

// TODO: Remove when the expo prebuild template targets AGP 9 (default BuildConfig generation removed)
const BUILD_CONFIG_MARKER = 'buildConfig true'

const BUILD_CONFIG_BLOCK = `\
subprojects {
    pluginManager.withPlugin('com.android.library') {
        android {
            buildFeatures {
                buildConfig true
            }
        }
    }
    pluginManager.withPlugin('com.android.application') {
        android {
            buildFeatures {
                buildConfig true
            }
        }
    }
}
`

const withBuildConfig: ConfigPlugin = (config) => {
  return withProjectBuildGradle(config, (mod) => {
    const contents = mod.modResults.contents
    if (!contents.includes(BUILD_CONFIG_MARKER)) {
      mod.modResults.contents = `${contents}\n${BUILD_CONFIG_BLOCK}`
    }

    return mod
  })
}

export default withBuildConfig
