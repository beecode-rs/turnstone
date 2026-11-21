import { type JSX } from 'react'
import { Modal, StyleSheet, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ZoomableImage } from '#src/ui-component/file-preview/zoomable-image'
import { IconButton } from '#src/ui-component/icon-button'

const CLOSE_BUTTON_COLOR = '#ffffff'
const CLOSE_BUTTON_MARGIN_PX = 4

interface FullscreenImageViewerProps {
  isVisible: boolean
  onClose: () => void
  uri: string
}

export const FullscreenImageViewer = (props: FullscreenImageViewerProps): JSX.Element => {
  const insets = useSafeAreaInsets()

  return (
    <Modal
      animationType="fade"
      navigationBarTranslucent
      onRequestClose={props.onClose}
      statusBarTranslucent
      transparent
      visible={props.isVisible}
    >
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.backdrop}>
          <ZoomableImage uri={props.uri} />
          <View
            style={[
              styles.closeFrame,
              {
                paddingRight: insets.right + CLOSE_BUTTON_MARGIN_PX,
                paddingTop: insets.top + CLOSE_BUTTON_MARGIN_PX,
              },
            ]}
          >
            <IconButton icon="close" iconColor={CLOSE_BUTTON_COLOR} onPress={props.onClose} tip="Close" />
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    flex: 1,
  },
  closeFrame: {
    position: 'absolute',
    right: 0,
    top: 0,
  },
  root: {
    flex: 1,
  },
})
