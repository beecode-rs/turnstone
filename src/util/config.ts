import { constant } from '#src/util/constant'

export const config = {
  isDev: process.env.NODE_ENV === 'development',
  sshRelayUrl: process.env.EXPO_PUBLIC_SSH_RELAY_URL ?? constant.ssh.relay.url,
}
