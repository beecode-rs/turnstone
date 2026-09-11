import { createHash } from 'crypto'

import { constant } from '#src/util/constant'

export const draftHostIdUtil = {
  forConnection(params: { host: string; port: number; username: string }): string {
    const { host, port, username } = params
    const connectionIdentity = `${username}@${host}:${String(port)}`

    return `${constant.draftHost.idPrefix}${createHash('sha256').update(connectionIdentity).digest('hex')}`
  },
}
