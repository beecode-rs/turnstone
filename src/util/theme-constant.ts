import '#src/asset/global.css'

import { Platform } from 'react-native'

export const BlueRamp = {
  blue100: '#DBE6FF',
  blue300: '#A5C8FF',
  blue700: '#1D4ED8',
  blue900: '#0B2E8F',
  blue950: '#1E3A8A',
} as const

export const GrayRamp = {
  black: '#000000',
  gray100: '#F0F0F3',
  gray200: '#E0E1E6',
  gray300: '#B0B4BA',
  gray500: '#60646C',
  gray700: '#2E3135',
  gray800: '#212225',
  white: '#FFFFFF',
} as const

export const Fonts = Platform.select({
  default: {
    mono: 'monospace',
    rounded: 'normal',
    sans: 'normal',
    serif: 'serif',
  },
  ios: {
    mono: 'ui-monospace',
    rounded: 'ui-rounded',
    sans: 'system-ui',
    serif: 'ui-serif',
  },
  web: {
    mono: 'var(--font-mono)',
    rounded: 'var(--font-rounded)',
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
  },
})

export const Spacing = {
  five: 32,
  four: 24,
  half: 2,
  one: 4,
  six: 64,
  three: 16,
  two: 8,
} as const

export const MaxContentWidth = 800
