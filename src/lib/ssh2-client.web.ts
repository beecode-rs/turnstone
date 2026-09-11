import { type ConnectConfig } from 'ssh2'

import { type SshTransportParams } from '#src/business/model/ssh-transport'
import { Ssh2ClientBase } from '#src/lib/ssh2-client-base'
import { WebsocketStream } from '#src/lib/websocket-stream'
import { config } from '#src/util/config'

const WEB_ALGORITHMS: ConnectConfig['algorithms'] = {
  cipher: ['aes256-gcm@openssh.com', 'aes128-gcm@openssh.com', 'aes256-ctr', 'aes192-ctr', 'aes128-ctr'],
  hmac: ['hmac-sha2-256-etm@openssh.com', 'hmac-sha2-256', 'hmac-sha2-512-etm@openssh.com', 'hmac-sha2-512'],
  serverHostKey: ['rsa-sha2-512', 'rsa-sha2-256', 'ecdsa-sha2-nistp256', 'ecdsa-sha2-nistp384', 'ssh-rsa'],
}

export class Ssh2Client extends Ssh2ClientBase {
  protected _toConnectConfig(connection: SshTransportParams): ConnectConfig {
    const connectConfig = super._toConnectConfig(connection)

    return {
      ...connectConfig,
      algorithms: WEB_ALGORITHMS,
      sock: new WebsocketStream({ url: this._buildRelayUrl(connection) }),
    }
  }

  protected _buildRelayUrl(connection: SshTransportParams): string {
    const target = `?host=${encodeURIComponent(connection.host)}&port=${String(connection.port)}`

    return `${config.sshRelayUrl}${target}`
  }
}
