import { type ConfigPlugin, withAppBuildGradle } from 'expo/config-plugins'

const APK_NAME_MARKER = 'VersionedApk'

const APK_NAME_BLOCK = `\
    def packageJson = new groovy.json.JsonSlurper().parseText(new File(projectRoot, 'package.json').text)
    applicationVariants.all { variant ->
        def copyVersionedApk = tasks.register("copy\${variant.name.capitalize()}${APK_NAME_MARKER}", Copy) {
            from(layout.buildDirectory.dir("outputs/apk/\${variant.name}"))
            include("app-\${variant.name}.apk")
            into(layout.buildDirectory.dir("outputs/versioned-apk"))
            rename { fileName -> "turnstone-\${packageJson.version}-\${variant.name}.apk" }
        }
        variant.packageApplicationProvider.configure { it.finalizedBy(copyVersionedApk) }
    }
`

const withApkName: ConfigPlugin = (config) => {
  return withAppBuildGradle(config, (mod) => {
    const contents = mod.modResults.contents
    if (!contents.includes(APK_NAME_MARKER)) {
      mod.modResults.contents = contents.replace('android {\n', `android {\n${APK_NAME_BLOCK}`)
    }

    return mod
  })
}

export default withApkName
