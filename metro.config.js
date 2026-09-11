const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const config = getDefaultConfig(__dirname)

config.resolver.assetExts = [...config.resolver.assetExts, 'css', 'html', 'txt']

const stubPath = (name) => {
  return path.resolve(__dirname, 'src', '__internal__', 'polyfill-stubs', `${name}.ts`)
}

const nodeStubModules = {
  assert: stubPath('assert'),
  child_process: stubPath('child_process'),
  'cpu-features': stubPath('cpu-features'),
  crypto: stubPath('crypto'),
  dns: stubPath('dns'),
  fs: stubPath('fs'),
  http: stubPath('http'),
  https: stubPath('https'),
  path: stubPath('path'),
  tls: stubPath('tls'),
  zlib: stubPath('zlib'),
}

const nativeNodeModuleAliases = {
  net: 'react-native-tcp-socket',
  'safer-buffer': 'buffer',
  stream: 'stream-browserify',
}

// RN 0.87 moved the runtime asset registry read by `resolveAssetSource` from
// `@react-native/assets-registry/registry` to `react-native/asset-registry`
// (public entry over `src/private/assets/AssetRegistry`). Expo SDK 57's metro
// config still registers bundled assets into the old registry, so asset ids
// resolve to null on RN 0.87 (`Cannot read property 'uri' of null` in
// expo-asset's `Asset.fromModule`). Alias the old specifier so Metro's asset
// codegen, expo-asset, and RN 0.87 all use the same registry.
// TODO(SDK 58): remove when @expo/metro-config targets RN 0.87+.
const nativeAssetRegistryAliases = {
  '@react-native/assets-registry/registry': 'react-native/asset-registry',
}

const webNodeModuleAliases = {
  assert: stubPath('assert'),
  'cpu-features': stubPath('cpu-features'),
  crypto: 'crypto-browserify',
  dns: stubPath('dns'),
  fs: stubPath('fs'),
  http: stubPath('http'),
  https: stubPath('https'),
  net: stubPath('net'),
  path: stubPath('path'),
  stream: 'stream-browserify',
  tls: stubPath('tls'),
  zlib: stubPath('zlib'),
}

const isNativePlatform = (platform) => {
  return platform === 'android' || platform === 'ios'
}

const ssh2ModuleStubs = [
  { moduleSuffix: `${path.sep}ssh2${path.sep}lib${path.sep}agent.js`, stubPath: stubPath('ssh2-agent') },
  {
    moduleSuffix: `${path.sep}ssh2${path.sep}lib${path.sep}http-agents.js`,
    stubPath: stubPath('ssh2-http-agents'),
  },
  { moduleSuffix: `${path.sep}ssh2${path.sep}lib${path.sep}keygen.js`, stubPath: stubPath('ssh2-keygen') },
  {
    moduleSuffix: `${path.sep}ssh2${path.sep}lib${path.sep}protocol${path.sep}crypto${path.sep}poly1305.js`,
    nativeOnly: true,
    stubPath: stubPath('ssh2-poly1305'),
  },
]

const findSsh2ModuleStubPath = (resolvedFilePath, platform) => {
  const matchingStub = ssh2ModuleStubs.find((entry) => {
    if (entry.nativeOnly === true && !isNativePlatform(platform)) {
      return false
    }
    return typeof resolvedFilePath === 'string' && resolvedFilePath.endsWith(entry.moduleSuffix)
  })
  return matchingStub?.stubPath
}

const quickCryptoSourceEntrySuffix = `${path.sep}react-native-quick-crypto${path.sep}src${path.sep}index.ts`
const quickCryptoCommonjsEntrySuffix = `${path.sep}react-native-quick-crypto${path.sep}lib${path.sep}commonjs${path.sep}index.js`

const defaultResolveRequest = config.resolver.resolveRequest

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (isNativePlatform(platform)) {
    if (nodeStubModules[moduleName]) {
      return { filePath: nodeStubModules[moduleName], type: 'sourceFile' }
    }
    if (nativeNodeModuleAliases[moduleName]) {
      return context.resolveRequest(context, nativeNodeModuleAliases[moduleName], platform)
    }
    if (nativeAssetRegistryAliases[moduleName]) {
      return context.resolveRequest(context, nativeAssetRegistryAliases[moduleName], platform)
    }
  }
  if (platform === 'web' && webNodeModuleAliases[moduleName]) {
    return context.resolveRequest(context, webNodeModuleAliases[moduleName], platform)
  }

  const resolveRequestFn = defaultResolveRequest ?? context.resolveRequest
  const resolution = resolveRequestFn(context, moduleName, platform)

  // quick-crypto's react-native entry (src/index.ts) mixes `export default` (compiled by Babel
  // into a getter-only exports.default) with a CommonJS-compat `module.exports.default = ...`
  // tail, which throws on Hermes at module evaluation: "Cannot assign to property 'default'
  // which has only a getter". Resolve to the prebuilt CommonJS entry instead, which Metro
  // treats as plain CJS.
  if (
    resolution?.type === 'sourceFile' &&
    typeof resolution.filePath === 'string' &&
    resolution.filePath.endsWith(quickCryptoSourceEntrySuffix)
  ) {
    return {
      filePath: resolution.filePath.replace(quickCryptoSourceEntrySuffix, quickCryptoCommonjsEntrySuffix),
      type: 'sourceFile',
    }
  }

  const resolvedSsh2StubPath = findSsh2ModuleStubPath(resolution?.filePath, platform)
  if (resolution?.type === 'sourceFile' && resolvedSsh2StubPath) {
    return { filePath: resolvedSsh2StubPath, type: 'sourceFile' }
  }
  return resolution
}

module.exports = config
