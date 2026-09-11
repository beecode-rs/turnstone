import { Ssh2ClientBase } from '#src/lib/ssh2-client-base'
import { tcpSocketNodeCompat } from '#src/lib/tcp-socket-node-compat'

tcpSocketNodeCompat.install()

export class Ssh2Client extends Ssh2ClientBase {}
