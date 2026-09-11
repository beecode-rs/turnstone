import fs from 'node:fs'
import path from 'node:path'

import { type ConfigPlugin, withDangerousMod } from 'expo/config-plugins'

// TODO: Remove when the expo prebuild template ships the Gradle version required by the Android Gradle plugin
const GRADLE_VERSION = '9.4.1'

const WRAPPER_PROPERTIES_PATH = 'android/gradle/wrapper/gradle-wrapper.properties'

const withGradleWrapper: ConfigPlugin = (config) => {
  return withDangerousMod(config, [
    'android',
    (mod) => {
      const filePath = path.join(mod.modRequest.projectRoot, WRAPPER_PROPERTIES_PATH)
      const contents = fs.readFileSync(filePath, 'utf8')
      const distributionUrl = `distributionUrl=https\\://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip`
      const updated = contents.replace(/^distributionUrl=.*$/m, distributionUrl)
      fs.writeFileSync(filePath, updated)

      return mod
    },
  ])
}

export default withGradleWrapper
