import { Image, type ImageLoadEventData } from 'expo-image'
import { type JSX, useEffect, useMemo, useRef, useState } from 'react'
import { type LayoutChangeEvent, StyleSheet } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { useAnimatedStyle, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'

const DOUBLE_TAP_MAX_DELAY_MS = 250
const DOUBLE_TAP_SCALE = 2.5
const MAX_SCALE = 8
const MIN_SCALE = 1
const RESET_SCALE_THRESHOLD = 1.05

interface ZoomableImageProps {
  onError?: () => void
  onLoad?: (event: ImageLoadEventData) => void
  onSingleTap?: () => void
  onZoomChange?: (isZoomed: boolean) => void
  uri: string
}

const resolveKnownAspect = (params: { sourceHeight?: number; sourceWidth?: number }): number => {
  const { sourceHeight, sourceWidth } = params
  const isKnown =
    typeof sourceWidth === 'number' && typeof sourceHeight === 'number' && sourceWidth > 0 && sourceHeight > 0
  if (!isKnown) {
    return 0
  }

  return sourceWidth / sourceHeight
}

export const ZoomableImage = (props: ZoomableImageProps): JSX.Element => {
  const [isPanEnabled, setIsPanEnabled] = useState(false)
  const scale = useSharedValue(MIN_SCALE)
  const startScale = useSharedValue(MIN_SCALE)
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const startTranslateX = useSharedValue(0)
  const startTranslateY = useSharedValue(0)
  const frameWidth = useSharedValue(0)
  const frameHeight = useSharedValue(0)
  const contentAspect = useSharedValue(0)
  const onSingleTapRef = useRef(props.onSingleTap)
  const onZoomChangeRef = useRef(props.onZoomChange)

  useEffect(() => {
    onSingleTapRef.current = props.onSingleTap
    onZoomChangeRef.current = props.onZoomChange
  })

  useEffect(() => {
    scale.value = MIN_SCALE
    startScale.value = MIN_SCALE
    translateX.value = 0
    translateY.value = 0
    contentAspect.value = 0
    setIsPanEnabled(false)
    onZoomChangeRef.current?.(false)
  }, [props.uri])

  const contentWidth = useDerivedValue(() => {
    if (contentAspect.value <= 0 || frameHeight.value <= 0) {
      return frameWidth.value
    }
    if (frameWidth.value / frameHeight.value > contentAspect.value) {
      return frameHeight.value * contentAspect.value
    }

    return frameWidth.value
  })

  const contentHeight = useDerivedValue(() => {
    if (contentAspect.value <= 0 || frameHeight.value <= 0) {
      return frameHeight.value
    }
    if (frameWidth.value / frameHeight.value > contentAspect.value) {
      return frameHeight.value
    }

    return frameWidth.value / contentAspect.value
  })

  const maxTranslateX = useDerivedValue(() => {
    return Math.max(0, (scale.value * contentWidth.value - frameWidth.value) / 2)
  })

  const maxTranslateY = useDerivedValue(() => {
    return Math.max(0, (scale.value * contentHeight.value - frameHeight.value) / 2)
  })

  const handleSingleTap = (): void => {
    onSingleTapRef.current?.()
  }

  const handleZoomChange = (isZoomed: boolean): void => {
    onZoomChangeRef.current?.(isZoomed)
  }

  const pinchGesture = useMemo(() => {
    return Gesture.Pinch()
      .onBegin(() => {
        startScale.value = scale.value
      })
      .onUpdate((event) => {
        const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, startScale.value * event.scale))
        const scaleDelta = nextScale - scale.value
        scale.value = nextScale
        translateX.value = translateX.value + scaleDelta * (frameWidth.value / 2 - event.focalX)
        translateY.value = translateY.value + scaleDelta * (frameHeight.value / 2 - event.focalY)
      })
      .onEnd(() => {
        if (scale.value >= RESET_SCALE_THRESHOLD) {
          translateX.value = withTiming(Math.min(maxTranslateX.value, Math.max(-maxTranslateX.value, translateX.value)))
          translateY.value = withTiming(Math.min(maxTranslateY.value, Math.max(-maxTranslateY.value, translateY.value)))
          scheduleOnRN(setIsPanEnabled, true)
          scheduleOnRN(handleZoomChange, true)

          return
        }
        scale.value = withTiming(MIN_SCALE)
        translateX.value = withTiming(0)
        translateY.value = withTiming(0)
        scheduleOnRN(setIsPanEnabled, false)
        scheduleOnRN(handleZoomChange, false)
      })
  }, [])

  const doubleTapGesture = useMemo(() => {
    return Gesture.Tap()
      .maxDelay(DOUBLE_TAP_MAX_DELAY_MS)
      .numberOfTaps(2)
      .onEnd(() => {
        translateX.value = withTiming(0)
        translateY.value = withTiming(0)
        if (scale.value > RESET_SCALE_THRESHOLD) {
          scale.value = withTiming(MIN_SCALE)
          scheduleOnRN(setIsPanEnabled, false)
          scheduleOnRN(handleZoomChange, false)

          return
        }
        scale.value = withTiming(DOUBLE_TAP_SCALE)
        scheduleOnRN(setIsPanEnabled, true)
        scheduleOnRN(handleZoomChange, true)
      })
  }, [])

  const singleTapGesture = useMemo(() => {
    return Gesture.Tap()
      .maxDelay(DOUBLE_TAP_MAX_DELAY_MS)
      .onEnd(() => {
        if (scale.value > RESET_SCALE_THRESHOLD) {
          return
        }
        scheduleOnRN(handleSingleTap)
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
        const nextTranslateX = startTranslateX.value + event.translationX
        const nextTranslateY = startTranslateY.value + event.translationY
        translateX.value = Math.min(maxTranslateX.value, Math.max(-maxTranslateX.value, nextTranslateX))
        translateY.value = Math.min(maxTranslateY.value, Math.max(-maxTranslateY.value, nextTranslateY))
      })
      .onEnd(() => {
        translateX.value = withTiming(Math.min(maxTranslateX.value, Math.max(-maxTranslateX.value, translateX.value)))
        translateY.value = withTiming(Math.min(maxTranslateY.value, Math.max(-maxTranslateY.value, translateY.value)))
      })
  }, [isPanEnabled])

  const composedGesture = useMemo(() => {
    return Gesture.Exclusive(doubleTapGesture, singleTapGesture, Gesture.Simultaneous(pinchGesture, panGesture))
  }, [doubleTapGesture, panGesture, pinchGesture, singleTapGesture])

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
    }
  })

  const handleLayout = (event: LayoutChangeEvent): void => {
    frameWidth.value = event.nativeEvent.layout.width
    frameHeight.value = event.nativeEvent.layout.height
  }

  const handleLoad = (event: ImageLoadEventData): void => {
    contentAspect.value = resolveKnownAspect({
      sourceHeight: event.source.height,
      sourceWidth: event.source.width,
    })
    props.onLoad?.(event)
  }

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View onLayout={handleLayout} style={[styles.frame, animatedStyle]}>
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
    height: '100%',
    width: '100%',
  },
  image: {
    height: '100%',
    width: '100%',
  },
})
