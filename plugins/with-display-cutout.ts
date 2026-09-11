import { AndroidConfig, type ConfigPlugin, withAndroidStyles } from 'expo/config-plugins'

const withDisplayCutout: ConfigPlugin = (config) => {
  return withAndroidStyles(config, (mod) => {
    AndroidConfig.Styles.assignStylesValue(mod.modResults, {
      add: true,
      name: 'android:windowLayoutInDisplayCutoutMode',
      parent: AndroidConfig.Styles.getAppThemeGroup(),
      targetApi: '27',
      value: 'shortEdges',
    })

    return mod
  })
}

export default withDisplayCutout
