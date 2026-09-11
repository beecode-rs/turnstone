import { type DebugFunction } from 'ssh2'

import { config } from '#src/util/config'
import { constant } from '#src/util/constant'

type TraceableSocket = {
  on?: (event: string, listener: (arg?: unknown) => void) => unknown
  once?: (event: string, listener: (arg?: unknown) => void) => unknown
}

type SocketHoldingClient = {
  _sock?: TraceableSocket
}

export type Ssh2SocketProbeSnapshot = {
  firstChunkHex: string | null
  lastError: string | null
  receivedBytes: number
}

export type Ssh2SocketProbe = {
  snapshot: () => Ssh2SocketProbeSnapshot
}

export class Ssh2Debug {
  isEnabled(): boolean {
    return config.isDev
  }

  logClientError(params: { error: Error }): void {
    const { error } = params

    this._log(`client error event: ${String(error)}`)
  }

  probeSocket(params: { client: unknown }): Ssh2SocketProbe | null {
    const { client } = params
    const socket = (client as SocketHoldingClient)._sock
    if (!socket || typeof socket.on !== 'function') {
      this._log('socket probe unavailable: no socket exposed yet')

      return null
    }
    const snapshot: Ssh2SocketProbeSnapshot = {
      firstChunkHex: null,
      lastError: null,
      receivedBytes: 0,
    }
    socket.once?.('data', (chunk) => {
      if (!(chunk instanceof Uint8Array)) {
        return
      }
      snapshot.firstChunkHex = this._toHexPreview(chunk)
      this._log(`socket first data chunk (${snapshot.firstChunkHex})`)
    })
    socket.on('data', (chunk) => {
      if (chunk instanceof Uint8Array) {
        snapshot.receivedBytes += chunk.byteLength
      }
    })
    socket.on('close', (hadError) => {
      this._log(`socket close event (hadError=${String(hadError)})`)
    })
    socket.on('end', () => {
      this._log('socket end event')
    })
    socket.on('error', (err) => {
      snapshot.lastError = String(err)
      this._log(`socket error event: ${snapshot.lastError}`)
    })

    return {
      snapshot: () => {
        return { ...snapshot }
      },
    }
  }

  toDebugLogger(): DebugFunction | undefined {
    if (!this.isEnabled()) {
      return undefined
    }

    return (message: string) => {
      this._log(message)
    }
  }

  toHandshakeFailureHint(params: {
    firstChunkHex: string | null
    host: string
    port: number
    receivedBytes: number
  }): string {
    const { firstChunkHex, host, port, receivedBytes } = params
    const target = `${host}:${String(port)}`
    if (receivedBytes === 0) {
      return `${target} accepted the TCP connection but sent no SSH banner - it is likely not an SSH server, a firewall or middlebox is interfering, or the connection was closed before the server responded`
    }
    if (firstChunkHex !== null && !this._toFirstChunkStartsWithSshBanner(firstChunkHex)) {
      return `${target} sent ${String(receivedBytes)} bytes of non-SSH data starting with ${firstChunkHex} - the target is not an SSH server on this port`
    }

    return `${target} sent an SSH banner (${String(receivedBytes)} bytes received) but the handshake did not complete`
  }

  protected _log(message: string): void {
    if (!this.isEnabled()) {
      return
    }
    // eslint-disable-next-line no-console -- dev-only transport trace surfaced in Metro logs
    console.log(`${constant.ssh.debug.logPrefix} ${message}`)
  }

  protected _toFirstChunkStartsWithSshBanner(firstChunkHex: string): boolean {
    if (firstChunkHex.length < 8) {
      return false
    }

    return firstChunkHex.startsWith('5353482d')
  }

  protected _toHexPreview(chunk: Uint8Array): string {
    const previewBytes = chunk.subarray(0, constant.ssh.debug.firstChunkPreviewBytes)

    return Array.from(previewBytes, (byte) => {
      return byte.toString(16).padStart(2, '0')
    }).join('')
  }
}
