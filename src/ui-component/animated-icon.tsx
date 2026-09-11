import { Image } from 'expo-image'
import * as SplashScreen from 'expo-splash-screen'
import { type JSX, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, { Easing, Keyframe } from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'

const DURATION = 600

export function AnimatedSplashOverlay(): JSX.Element | null {
  const [animate, setAnimate] = useState(false)
  const [visible, setVisible] = useState(true)

  if (!visible) {
    return null
  }

  const splashKeyframe = new Keyframe({
    0: {
      opacity: 1,
      transform: [{ scale: 1 }],
    },
    20: {
      opacity: 1,
    },
    70: {
      easing: Easing.elastic(0.7),
      opacity: 0,
    },
    100: {
      easing: Easing.elastic(0.7),
      opacity: 0,
      transform: [{ scale: 1 }],
    },
  })

  const image = <Image contentFit="contain" source={require('@/assets/images/splash.png')} style={styles.image} />

  if (animate) {
    return (
      <Animated.View
        entering={splashKeyframe.duration(DURATION).withCallback((finished) => {
          'worklet'
          if (finished) {
            scheduleOnRN(setVisible, false)
          }
        })}
        style={styles.splashOverlay}
      >
        {image}
      </Animated.View>
    )
  }

  return (
    <View
      onLayout={() => {
        void SplashScreen.hideAsync().finally(() => {
          setAnimate(true)
        })
      }}
      style={styles.splashOverlay}
    >
      {image}
    </View>
  )
}

const styles = StyleSheet.create({
  image: {
    ...StyleSheet.absoluteFill,
  },
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#001030',
    zIndex: 1000,
  },
})
