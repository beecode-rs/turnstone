import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const iosDir = fileURLToPath(new URL('../ios/', import.meta.url))
const podsRoot = join(iosDir, 'Pods')
const supportFilesDir = join(podsRoot, 'Target Support Files')
const podfilePath = join(iosDir, 'Podfile')
const moduleMapPath = join('React-Core-prebuilt', 'Headers', 'module.modulemap')
const moduleMapFlag = `"-fmodule-map-file=$(PODS_ROOT)/${moduleMapPath}"`

const isReleaseBuild = () => {
  return process.env.CI === 'true' || process.env.TURNSTONE_RELEASE_BUILD === '1'
}

// The expo dev-client pods (dev-launcher, dev-menu, ...) still target the
// react-native 0.86 legacy bridge APIs that 0.87 removed (`RCTCxxBridge`,
// `RCTRootContentView`, the `bridge` accessors), so they cannot compile against
// react-native 0.87.1. They are development tools that no release binary needs
// and nothing in the app imports, so release builds exclude them from expo
// autolinking instead of patching every removed API. Local dev builds keep
// them, following the same CI / TURNSTONE_RELEASE_BUILD convention as
// plugins/with-app-name.ts.
const excludedDevModules = ['expo-dev-client', 'expo-dev-launcher', 'expo-dev-menu', 'expo-dev-menu-interface']

const excludeDevModulesFromAutolinking = () => {
  if (!isReleaseBuild()) {
    console.log('local dev build — keeping expo dev-client modules in autolinking')
    return
  }
  const source = readFileSync(podfilePath, 'utf8')
  if (source.includes('use_expo_modules!(exclude:')) {
    console.log('ios/Podfile already excludes expo dev-client modules')
    return
  }

  const exclusions = excludedDevModules.map((name) => `'${name}'`).join(', ')
  const patched = source.replace('use_expo_modules!', `use_expo_modules!(exclude: [${exclusions}])`)
  if (patched === source) {
    console.error('could not find `use_expo_modules!` in ios/Podfile')
    console.error('the expo prebuild template may have changed — update scripts/patch-ios-build.mjs')
    process.exit(1)
  }

  writeFileSync(podfilePath, patched)
  console.log(`patched ios/Podfile to exclude ${excludedDevModules.join(', ')} from autolinking`)
}

// react-native 0.87 ships the iOS core as prebuilt frameworks whose headers
// include relocated namespaces (`RCTDeprecation`, `yoga`, `react/...`) behind a
// separate module map that every modular `<React/...>` consumer must activate
// through -fmodule-map-file (see scripts/cocoapods/rncore.rb in react-native).
// RN's post-install only adds the flag to RN's own pods, so source pods that
// import React headers (Expo, ...) fail with
// `-Werror=non-modular-include-in-framework-module` when clang builds the React
// framework module. This appends the flag to every generated pod xcconfig
// after `pod install` has run. It is a no-op once react-native pairs natively
// with the installed Expo SDK again (SDK 58+).
const patchPodsXcconfigs = () => {
  if (!existsSync(join(podsRoot, moduleMapPath))) {
    console.log('no React-Core-prebuilt module map found — skipping pod xcconfig patch')
    return
  }

  let patched = 0
  for (const entry of readdirSync(supportFilesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue
    }
    const podDir = join(supportFilesDir, entry.name)
    for (const file of readdirSync(podDir)) {
      if (!file.endsWith('.xcconfig')) {
        continue
      }
      const xcconfigPath = join(podDir, file)
      const source = readFileSync(xcconfigPath, 'utf8')
      if (source.includes(moduleMapPath)) {
        continue
      }
      const addition = [
        `OTHER_CFLAGS = $(inherited) ${moduleMapFlag}`,
        `OTHER_CPLUSPLUSFLAGS = $(inherited) ${moduleMapFlag}`,
        `OTHER_SWIFT_FLAGS = $(inherited) -Xcc ${moduleMapFlag}`,
        '',
      ].join('\n')
      writeFileSync(xcconfigPath, `${source.endsWith('\n') ? source : `${source}\n`}${addition}`)
      patched += 1
    }
  }

  console.log(`patched ${patched} pod xcconfigs with the React-Core-prebuilt module map flag`)
}

excludeDevModulesFromAutolinking()
patchPodsXcconfigs()
