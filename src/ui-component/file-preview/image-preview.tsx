import { Image, type ImageLoadEventData } from 'expo-image'
import { type JSX, useMemo, useState } from 'react'
import { StyleSheet, useWindowDimensions } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'

import { binaryPreviewUtil } from '#src/util/binary-preview-util'

const DOUBLE_TAP_SCALE = 2.5
const MAX_SCALE = 8
const MIN_SCALE = 1
const RESET_SCALE_THRESHOLD = 1.05
const ZOOM_HEIGHT_RATIO = 0.7

interface ImagePreviewProps {
  onError?: () => void
  uri: string
}

export const ImagePreview = (props: ImagePreviewProps): JSX.Element => {
  const { height: windowHeight, width: windowWidth } = useWindowDimensions()
  const [aspect, setAspect] = useState<number | null>(null)
  const [isPanEnabled, setIsPanEnabled] = useState(false)
  const scale = useSharedValue(MIN_SCALE)
  const startScale = useSharedValue(MIN_SCALE)
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const startTranslateX = useSharedValue(0)
  const startTranslateY = useSharedValue(0)

  const containerHeight = useMemo(() => {
    const maxHeight = windowHeight * ZOOM_HEIGHT_RATIO
    if (aspect === null) {
      return maxHeight
    }
    const fitHeight = windowWidth / aspect

    return Math.min(fitHeight, maxHeight)
  }, [aspect, windowHeight, windowWidth])

  const pinchGesture = useMemo(() => {
    return Gesture.Pinch()
      .onBegin(() => {
        startScale.value = scale.value
      })
      .onUpdate((event) => {
        const nextScale = startScale.value * event.scale
        if (nextScale < MIN_SCALE) {
          scale.value = MIN_SCALE

          return
        }
        if (nextScale > MAX_SCALE) {
          scale.value = MAX_SCALE

          return
        }
        scale.value = nextScale
      })
      .onEnd(() => {
        if (scale.value >= RESET_SCALE_THRESHOLD) {
          scheduleOnRN(setIsPanEnabled, true)

          return
        }
        scale.value = withTiming(MIN_SCALE)
        translateX.value = withTiming(0)
        translateY.value = withTiming(0)
        scheduleOnRN(setIsPanEnabled, false)
      })
  }, [])

  const doubleTapGesture = useMemo(() => {
    return Gesture.Tap()
      .numberOfTaps(2)
      .onEnd(() => {
        if (scale.value > MIN_SCALE) {
          scale.value = withTiming(MIN_SCALE)
          translateX.value = withTiming(0)
          translateY.value = withTiming(0)
          scheduleOnRN(setIsPanEnabled, false)

          return
        }
        scale.value = withTiming(DOUBLE_TAP_SCALE)
        scheduleOnRN(setIsPanEnabled, true)
      })
  }, [])

  const panGesture = useMemo(() => {
    return Gesture.Pan()
      .enabled(isPanEnabled)
      .onBegin(() => {
        startTranslateX.value = translateX.value
        startTranslateY.value = translateY.value
      })
      .onUpdate((event) => {
        const maxTranslateX = ((scale.value - MIN_SCALE) * windowWidth) / 2
        const maxTranslateY = ((scale.value - MIN_SCALE) * containerHeight) / 2
        const nextTranslateX = startTranslateX.value + event.translationX
        const nextTranslateY = startTranslateY.value + event.translationY
        if (nextTranslateX < -maxTranslateX) {
          translateX.value = -maxTranslateX
        } else if (nextTranslateX > maxTranslateX) {
          translateX.value = maxTranslateX
        } else {
          translateX.value = nextTranslateX
        }
        if (nextTranslateY < -maxTranslateY) {
          translateY.value = -maxTranslateY
        } else if (nextTranslateY > maxTranslateY) {
          translateY.value = maxTranslateY
        } else {
          translateY.value = nextTranslateY
        }
      })
  }, [containerHeight, isPanEnabled, windowWidth])

  const composedGesture = useMemo(() => {
    return Gesture.Exclusive(doubleTapGesture, Gesture.Simultaneous(pinchGesture, panGesture))
  }, [doubleTapGesture, panGesture, pinchGesture])

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
    }
  })

  const handleLoad = (event: ImageLoadEventData): void => {
    setAspect(
      binaryPreviewUtil.resolveAspect({
        sourceHeight: event.source.height,
        sourceWidth: event.source.width,
      }),
    )
  }

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.frame, animatedStyle, { height: containerHeight }]}>
        <Image
          contentFit="contain"
          onError={() => {
            props.onError?.()
          }}
          onLoad={handleLoad}
          source={props.uri}
          style={styles.image}
        />
      </Animated.View>
    </GestureDetector>
  )
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  image: {
    flex: 1,
    width: '100%',
  },
})
