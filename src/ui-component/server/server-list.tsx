import { MaterialCommunityIcons } from '@expo/vector-icons'
import { type ComponentProps, type JSX } from 'react'
import { FlatList, StyleSheet, View } from 'react-native'
import { Button, List, Text } from 'react-native-paper'

import { HostAuthMethodMapper } from '#src/business/enum/host-auth-method-mapper-enum'
import { type HostConfig } from '#src/business/model/host-config'
import { RowActionsMenu, type RowActionsMenuItem } from '#src/ui-component/row-actions-menu'
import { useThemePreference } from '#src/ui-component/theme/theme-context'

type AuthIconName = ComponentProps<typeof MaterialCommunityIcons>['name']

const AUTH_METHOD_ICONS: Record<HostAuthMethodMapper, AuthIconName> = {
  [HostAuthMethodMapper.DEVICE_KEY]: 'cellphone-key',
  [HostAuthMethodMapper.KEY]: 'certificate-outline',
  [HostAuthMethodMapper.PASSWORD]: 'form-textbox-password',
}

interface ServerListProps {
  onPressAdd: () => void
  onPressClone: (server: HostConfig) => void
  onPressDelete: (server: HostConfig) => void
  onPressEdit: (server: HostConfig) => void
  onPressServer?: (server: HostConfig) => void
  servers: HostConfig[]
}

export const ServerList = (props: ServerListProps): JSX.Element => {
  const { md3Theme } = useThemePreference()

  const renderRow = (info: { item: HostConfig }): JSX.Element => {
    const server = info.item

    const actions: RowActionsMenuItem[] = [
      {
        icon: 'content-copy',
        iconColor: md3Theme.colors.onSurfaceVariant,
        label: 'Clone server',
        onPress: () => {
          props.onPressClone(server)
        },
      },
      {
        icon: 'pencil',
        iconColor: md3Theme.colors.primary,
        label: 'Edit server',
        onPress: () => {
          props.onPressEdit(server)
        },
      },
      {
        icon: 'delete',
        iconColor: md3Theme.colors.error,
        label: 'Delete server',
        onPress: () => {
          props.onPressDelete(server)
        },
      },
    ]

    return (
      <List.Item
        description={
          <Text numberOfLines={1} style={[styles.rowHost, { color: md3Theme.colors.onSurfaceVariant }]}>
            <MaterialCommunityIcons
              color={md3Theme.colors.onSurfaceVariant}
              name={AUTH_METHOD_ICONS[server.authMethod]}
              size={14}
              style={styles.rowHostAuthIcon}
            />{' '}
            {`${server.username}@${server.host}:${String(server.port)}`}
          </Text>
        }
        descriptionNumberOfLines={1}
        left={() => {
          return <List.Icon color={md3Theme.colors.onSurfaceVariant} icon="server" style={styles.rowLeadingIcon} />
        }}
        onPress={() => {
          props.onPressServer?.(server)
        }}
        right={() => {
          return <RowActionsMenu items={actions} tip="Server actions" />
        }}
        style={[styles.row, { backgroundColor: md3Theme.colors.surfaceVariant, paddingRight: 0 }]}
        title={server.label}
        titleStyle={styles.rowTitle}
      />
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: md3Theme.colors.background }]}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={props.servers}
        keyExtractor={(server) => {
          return server.id
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText} variant="titleMedium">
              No servers configured yet.
            </Text>
            <Text style={styles.emptyHint} variant="bodyMedium">
              Add a server to start browsing its files over SSH.
            </Text>
            <Button icon="plus" mode="contained" onPress={props.onPressAdd} style={styles.emptyAction}>
              Add new server
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
  rowHost: {
    fontFamily: 'jetBrainsMonoRegular',
    fontSize: 13,
  },
  rowHostAuthIcon: {
    opacity: 0.6,
  },
  rowLeadingIcon: {
    paddingLeft: 8,
  },
  rowTitle: {
    fontWeight: '600',
    marginBottom: 2,
  },
})
