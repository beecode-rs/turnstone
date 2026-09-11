import { type ConfigPlugin } from 'expo/config-plugins'

const DEV_NAME_SUFFIX = ' (dev)'

const isLocalDevBuild = (): boolean => {
  return process.env.CI !== 'true' && process.env.TURNSTONE_RELEASE_BUILD !== '1'
}

const withAppName: ConfigPlugin = (config) => {
  if (isLocalDevBuild() && !config.name.endsWith(DEV_NAME_SUFFIX)) {
    config.name = `${config.name}${DEV_NAME_SUFFIX}`
  }

  return config
}

export default withAppName
