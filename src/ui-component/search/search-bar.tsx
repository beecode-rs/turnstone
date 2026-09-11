import { type JSX } from 'react'
import { StyleSheet, View } from 'react-native'
import { Button, Searchbar } from 'react-native-paper'

import { useThemePreference } from '#src/ui-component/theme/theme-context'

interface SearchBarProps {
  isSearching: boolean
  onCancel: () => void
  onChangeQuery: (query: string) => void
  onSubmit: () => void
  query: string
}

export const SearchBar = (props: SearchBarProps): JSX.Element => {
  const { navigationTheme } = useThemePreference()

  return (
    <View style={[styles.container, { backgroundColor: navigationTheme.colors.background }]}>
      <View style={styles.inputRow}>
        <Searchbar
          onChangeText={props.onChangeQuery}
          onSubmitEditing={props.onSubmit}
          placeholder="Search pattern"
          style={styles.searchbar}
          value={props.query}
        />
        {props.isSearching && (
          <Button mode="text" onPress={props.onCancel} style={styles.cancelButton}>
            Cancel
          </Button>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  cancelButton: {
    marginLeft: 4,
  },
  container: {
    paddingBottom: 4,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  inputRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  searchbar: {
    flex: 1,
  },
})
