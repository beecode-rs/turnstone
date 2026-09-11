import { type JSX } from 'react'
import { Platform, StyleSheet, Text, type TextProps } from 'react-native'

import { ThemedColorMapper } from '#src/business/enum/themed-color-mapper-enum'
import { effectiveThemeUtil } from '#src/ui-component/theme/effective-theme'
import { useThemePreference } from '#src/ui-component/theme/theme-context'
import { Fonts } from '#src/util/theme-constant'

export type ThemedTextProps = TextProps & {
  themeColor?: ThemedColorMapper
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code'
}

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps): JSX.Element {
  const { md3Theme } = useThemePreference()

  const resolveColor = (): string => {
    if (type === 'linkPrimary') {
      return md3Theme.colors.primary
    }

    return effectiveThemeUtil.resolveThemedColor({ color: themeColor ?? ThemedColorMapper.TEXT, md3Theme })
  }

  return (
    <Text
      style={[
        { color: resolveColor() },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  )
}

const styles = StyleSheet.create({
  code: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
  },
  default: {
    fontSize: 16,
    fontWeight: 500,
    lineHeight: 24,
  },
  link: {
    fontSize: 14,
    lineHeight: 30,
  },
  linkPrimary: {
    fontSize: 14,
    lineHeight: 30,
  },
  small: {
    fontSize: 14,
    fontWeight: 500,
    lineHeight: 20,
  },
  smallBold: {
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 20,
  },
  subtitle: {
    fontSize: 32,
    fontWeight: 600,
    lineHeight: 44,
  },
  title: {
    fontSize: 48,
    fontWeight: 600,
    lineHeight: 52,
  },
})
