import { type JSX } from 'react'
import { View, type ViewProps } from 'react-native'

import { ThemedColorMapper } from '#src/business/enum/themed-color-mapper-enum'
import { effectiveThemeUtil } from '#src/ui-component/theme/effective-theme'
import { useThemePreference } from '#src/ui-component/theme/theme-context'

export type ThemedViewProps = ViewProps & {
  type?: ThemedColorMapper
}

export function ThemedView({ style, type, ...otherProps }: ThemedViewProps): JSX.Element {
  const { md3Theme } = useThemePreference()

  const backgroundColor = effectiveThemeUtil.resolveThemedColor({
    color: type ?? ThemedColorMapper.BACKGROUND,
    md3Theme,
  })

  return <View style={[{ backgroundColor }, style]} {...otherProps} />
}
