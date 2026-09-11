// Supplements: ../ssh2-client-base.ts, ../tcp-socket-node-compat.ts, ../ssh2-poly1305.ts
// Covers: full ssh2 handshake over a socket replicating react-native-tcp-socket's JS semantics (pause buffering, _pending lifecycle, pre-connect pause guard, end/close event shapes) with the compat shim and the pure-JS poly1305 stub installed - module aliasing and a live socket pair cannot be expressed in contract.yaml

import { generateKeyPairSync } from 'node:crypto'
import { createRequire } from 'node:module'
import net from 'node:net'
import { afterAll, describe, expect, it, vi } from 'vitest'

import { EventEmitter } from 'eventemitter3'

import { ssh2Poly1305 } from '#src/lib/ssh2-poly1305'
import { tcpSocketNodeCompat } from '#src/lib/tcp-socket-node-compat'

vi.mock('react-native-tcp-socket', () => {
  return {
    default: {
      Socket: class {},
    },
  }
})

type UnderlyingConnectOptions = { host: string; port: number }

class FakeTcpSocket extends EventEmitter {
  allowHalfOpen = false
  _connecting = false
  _destroyed = false
  _paused = false
  _pending = true
  _pausedDataEvents: Buffer[] = []
  _underlying: net.Socket | null = null

  get connecting(): boolean {
    return this._connecting
  }

  get destroyed(): boolean {
    return this._destroyed
  }

  connect(options: UnderlyingConnectOptions): FakeTcpSocket {
    this._connecting = true
    const underlying = net.connect({ host: options.host, port: options.port })
    this._underlying = underlying
    underlying.on('connect', () => {
      this._connecting = false
      this._pending = false
      this.emit('connect')
    })
    underlying.on('data', (chunk: Buffer) => {
      if (!this._paused) {
        this.emit('data', chunk)
        return
      }
      this._pausedDataEvents.push(chunk)
    })
    underlying.on('end', () => {
      if (!this.allowHalfOpen) {
        this.end()
      }
      this.emit('end')
    })
    underlying.on('error', (err: Error) => {
      this.destroy()
      this.emit('error', err)
    })
    underlying.on('close', (hadError: boolean) => {
      this._pending = true
      this.emit('close', hadError)
    })
    return this
  }

  write(buffer: Buffer, _encoding?: unknown, cb?: (err?: Error) => void): boolean {
    if (this._pending || this._destroyed) {
      throw new Error('Socket is closed.')
    }
    this._underlying?.write(buffer, () => {
      if (cb) {
        cb()
      }
    })
    return true
  }

  end(): FakeTcpSocket {
    if (this._pending || this._destroyed) {
      return this
    }
    this._underlying?.end()
    return this
  }

  destroy(): FakeTcpSocket {
    if (this._destroyed) {
      return this
    }
    this._destroyed = true
    this._underlying?.destroy()
    return this
  }

  pause(): FakeTcpSocket {
    if (this._paused) {
      return this
    }
    this._paused = true
    this._underlying?.pause()
    this.emit('pause')
    return this
  }

  resume(): void {
    if (!this._paused) {
      return
    }
    this._paused = false
    this.emit('resume')
    this._recoverDataEventsAfterPause()
  }

  setTimeout(timeoutMsecs: number): FakeTcpSocket {
    this._underlying?.setTimeout(timeoutMsecs)
    return this
  }

  setNoDelay(noDelay: boolean): FakeTcpSocket {
    this._underlying?.setNoDelay(noDelay)
    return this
  }

  setKeepAlive(enable: boolean, initialDelay: number): FakeTcpSocket {
    this._underlying?.setKeepAlive(enable, initialDelay)
    return this
  }

  protected _recoverDataEventsAfterPause(): void {
    while (this._pausedDataEvents.length > 0) {
      const chunk = this._pausedDataEvents[0]
      this._pausedDataEvents = this._pausedDataEvents.slice(1)
      this.emit('data', chunk)
      if (this._paused) {
        return
      }
    }
    this._underlying?.resume()
  }
}

tcpSocketNodeCompat.install(FakeTcpSocket)

const nodeRequire = createRequire(import.meta.url)
const nodeModule = nodeRequire('node:module') as {
  _load: (request: string, parent: unknown, isMain: boolean) => unknown
}
const originalLoad = nodeModule._load
const fakeNet = { ...net, Socket: FakeTcpSocket }

nodeModule._load = (request, parent, isMain) => {
  if (request === 'net') {
    return fakeNet
  }
  if (request.endsWith('poly1305.js')) {
    return () => {
      return ssh2Poly1305.createModule()
    }
  }
  return originalLoad(request, parent, isMain)
}

afterAll(() => {
  nodeModule._load = originalLoad
})

const ssh2 = nodeRequire('ssh2') as {
  Client: any
  Server: any
}

const startSshServer = async (): Promise<{ port: number; close: () => void }> => {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  const hostKeyPem = privateKey.export({ format: 'pem', type: 'pkcs1' })
  const server = new ssh2.Server({ hostKeys: [hostKeyPem] }, (client: any) => {
    client.on('authentication', (ctx: any) => {
      if (ctx.method === 'password' && ctx.password === 'secret') {
        ctx.accept()
        return
      }
      ctx.reject(['password'])
    })
    client.on('ready', () => {
      client.on('session', (accept: () => any) => {
        const session = accept()
        session.on('exec', (acceptExec: () => any, _reject: unknown, info: { command: string }) => {
          const stream = acceptExec()
          stream.end(`ran:${info.command}\n`)
        })
      })
    })
  })
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve()
    })
  })
  return {
    port: (server.address() as any).port as number,
    close: () => {
      server.close()
    },
  }
}

const connectClient = (params: {
  algorithms?: { cipher: string[] }
  port: number
}): Promise<{
  client: any
  execOutput: (command: string) => Promise<string>
}> => {
  return new Promise((resolve, reject) => {
    const client = new ssh2.Client()
    client.once('ready', () => {
      resolve({
        client,
        execOutput: (command: string) => {
          return new Promise((resolveExec, rejectExec) => {
            client.exec(command, (err: Error | undefined, stream: any) => {
              if (err) {
                rejectExec(err)
                return
              }
              let output = ''
              stream.on('data', (chunk: Buffer) => {
                output += chunk.toString('utf8')
              })
              stream.on('close', () => {
                resolveExec(output)
              })
            })
          })
        },
      })
    })
    client.once('error', reject)
    client.connect({
      algorithms: params.algorithms,
      host: '127.0.0.1',
      password: 'secret',
      port: params.port,
      readyTimeout: 8000,
      username: 'tester',
    })
  })
}

describe('ssh2 native stack (tcp-socket semantics + compat shim + poly1305 stub)', () => {
  it('completes the handshake and exec with chacha20-poly1305 through the fake tcp socket', async () => {
    const server = await startSshServer()
    try {
      const { client, execOutput } = await connectClient({
        algorithms: { cipher: ['chacha20-poly1305@openssh.com'] },
        port: server.port,
      })
      expect(client._sock instanceof FakeTcpSocket).toBe(true)
      const output = await execOutput('echo ok')
      client.end()
      expect(output).toBe('ran:echo ok\n')
    } finally {
      server.close()
    }
  })

  it('completes the handshake with default ciphers through the fake tcp socket', async () => {
    const server = await startSshServer()
    try {
      const { client, execOutput } = await connectClient({ port: server.port })
      expect(client._sock instanceof FakeTcpSocket).toBe(true)
      const output = await execOutput('echo plain')
      client.end()
      expect(output).toBe('ran:echo plain\n')
    } finally {
      server.close()
    }
  })
})
