import { type JSX } from 'react'
import { FlatList, StyleSheet, View } from 'react-native'
import { Button, List, Text } from 'react-native-paper'

import { type ProjectConfig } from '#src/business/model/project-config'
import { RowActionsMenu, type RowActionsMenuItem } from '#src/ui-component/row-actions-menu'
import { useThemePreference } from '#src/ui-component/theme/theme-context'

interface ProjectListProps {
  onPressAdd: () => void
  onPressClone: (project: ProjectConfig) => void
  onPressDelete: (project: ProjectConfig) => void
  onPressEdit: (project: ProjectConfig) => void
  onPressProject: (project: ProjectConfig) => void
  projects: ProjectConfig[]
}

export const ProjectList = (props: ProjectListProps): JSX.Element => {
  const { md3Theme } = useThemePreference()

  const renderRow = (info: { item: ProjectConfig }): JSX.Element => {
    const project = info.item

    const actions: RowActionsMenuItem[] = [
      {
        icon: 'content-copy',
        iconColor: md3Theme.colors.onSurfaceVariant,
        label: 'Clone project',
        onPress: () => {
          props.onPressClone(project)
        },
      },
      {
        icon: 'pencil',
        iconColor: md3Theme.colors.primary,
        label: 'Edit project',
        onPress: () => {
          props.onPressEdit(project)
        },
      },
      {
        icon: 'delete',
        iconColor: md3Theme.colors.error,
        label: 'Delete project',
        onPress: () => {
          props.onPressDelete(project)
        },
      },
    ]

    return (
      <List.Item
        description={
          <Text numberOfLines={1} style={[styles.rowPath, { color: md3Theme.colors.onSurfaceVariant }]}>
            {project.path}
          </Text>
        }
        descriptionNumberOfLines={1}
        left={() => {
          return <List.Icon color={md3Theme.colors.onSurfaceVariant} icon="folder" style={styles.rowLeadingIcon} />
        }}
        onPress={() => {
          props.onPressProject(project)
        }}
        right={() => {
          return <RowActionsMenu items={actions} tip="Project actions" />
        }}
        style={[styles.row, { backgroundColor: md3Theme.colors.surfaceVariant, paddingRight: 0 }]}
        title={project.name}
        titleStyle={styles.rowTitle}
      />
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: md3Theme.colors.background }]}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={props.projects}
        keyExtractor={(project) => {
          return project.id
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText} variant="titleMedium">
              No projects yet.
            </Text>
            <Text style={styles.emptyHint} variant="bodyMedium">
              Add a project to start browsing its files over SSH.
            </Text>
            <Button icon="plus" mode="contained" onPress={props.onPressAdd} style={styles.emptyAction}>
              Add new project
            </Button>
          </View>
        }
        renderItem={renderRow}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  empty: {
    alignItems: 'center',
    gap: 8,
    padding: 32,
  },
  emptyAction: {
    marginTop: 8,
  },
  emptyHint: {
    opacity: 0.7,
    textAlign: 'center',
  },
  emptyText: {
    fontWeight: '600',
  },
  listContent: {
    gap: 8,
    padding: 16,
  },
  row: {
    borderRadius: 12,
    paddingVertical: 2,
  },
  rowLeadingIcon: {
    paddingLeft: 8,
  },
  rowPath: {
    fontFamily: 'jetBrainsMonoRegular',
    fontSize: 13,
  },
  rowTitle: {
    fontWeight: '600',
    marginBottom: 2,
  },
})
