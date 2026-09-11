// Supplements: ../ssh2-client.web.ts and ../../../scripts/ssh-web-relay.mjs
// Covers: end-to-end web SSH transport (websocket stream + relay + connect/exec) and connect failure paths - async network I/O is not expressible in contract.yaml

import { spawn, type ChildProcess } from 'node:child_process'
import { generateKeyPairSync } from 'node:crypto'
import { createServer, connect, type AddressInfo, type Server as TcpServer } from 'node:net'
import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { Server as SshServer, type Connection, type Session } from 'ssh2'

const SMOKE_PASSWORD = 'smoke-password'
const WRONG_PASSWORD = 'wrong-password'

let isAuthFailureFollowedByClose = false
let relayProcess: ChildProcess | undefined
let sshPort = 0
let sshServer: SshServer | undefined

const listenOnEphemeralPort = (server: TcpServer): Promise<number> => {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as AddressInfo
      resolve(address.port)
    })
  })
}

const closeTcpServer = (server: TcpServer): Promise<void> => {
  return new Promise((resolve) => {
    server.close(() => {
      resolve()
    })
  })
}

const reservePort = async (): Promise<number> => {
  const probe = createServer()
  const port = await listenOnEphemeralPort(probe)
  await closeTcpServer(probe)

  return port
}

const waitForPort = (port: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    Array.from({ length: 50 }).forEach((_, index) => {
      setTimeout(() => {
        const socket = connect(port, '127.0.0.1')
        socket.on('connect', () => {
          socket.destroy()
          resolve()
        })
        socket.on('error', () => {
          socket.destroy()
        })
      }, index * 100)
    })
    setTimeout(() => {
      reject(new Error(`relay did not start listening on port ${port}`))
    }, 5500)
  })
}

const handleServerConnection = (conn: Connection): void => {
  conn.on('authentication', (ctx) => {
    if (ctx.method === 'password' && ctx.password === SMOKE_PASSWORD) {
      ctx.accept()
      return
    }
    ctx.reject(['password'])
    if (isAuthFailureFollowedByClose) {
      conn.end()
    }
  })
  conn.on('session', (acceptSession) => {
    const session: Session = acceptSession()
    session.on('exec', (accept, _reject, info) => {
      const stream = accept()
      stream.write(info.command)
      stream.exit(0)
      stream.end()
      stream.close()
    })
  })
}

beforeAll(async () => {
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
  const hostKeyPem = privateKey.export({ format: 'pem', type: 'sec1' }).toString()
  sshServer = new SshServer({ hostKeys: [hostKeyPem] })
  sshServer.on('connection', handleServerConnection)
  sshPort = await listenOnEphemeralPort(sshServer)
  const relayPort = await reservePort()
  relayProcess = spawn(process.execPath, ['scripts/ssh-web-relay.mjs', '--port', String(relayPort)], {
    cwd: process.cwd(),
    stdio: 'ignore',
  })
  await waitForPort(relayPort)
  process.env.EXPO_PUBLIC_SSH_RELAY_URL = `ws://127.0.0.1:${relayPort}`
})

afterAll(async () => {
  relayProcess?.kill()
  if (sshServer) {
    await closeTcpServer(sshServer)
  }
})

const connectWithPassword = async (params: { password: string }): Promise<unknown> => {
  const { Ssh2Client } = await import('#src/lib/ssh2-client.web')
  const client = new Ssh2Client({
    hostVerifier: (_key, verify) => {
      verify(true)
    },
  })
  try {
    await client.connect({
      connection: { host: '127.0.0.1', password: params.password, port: sshPort, username: 'smoke-user' },
    })
    return 'connected'
  } catch (err) {
    return err
  } finally {
    client.disconnect()
    await new Promise((resolve) => {
      setTimeout(resolve, 100)
    })
  }
}

it('connects and execs over the websocket relay', async () => {
  const { Ssh2Client } = await import('#src/lib/ssh2-client.web')
  const client = new Ssh2Client({
    hostVerifier: (_key, verify) => {
      verify(true)
    },
  })
  await client.connect({
    connection: { host: '127.0.0.1', password: SMOKE_PASSWORD, port: sshPort, username: 'smoke-user' },
  })
  const stdoutChunks: Buffer[] = []
  const handle = client.exec({
    command: 'smoke-echo',
    onStderrChunk: (_chunk) => {
      return undefined
    },
    onStdoutChunk: (chunk) => {
      stdoutChunks.push(chunk)
    },
  })
  const result = await handle.result
  client.disconnect()
  await new Promise((resolve) => {
    setTimeout(resolve, 200)
  })

  expect(result.exitCode).toBe(0)
  expect(result.isCancelled).toBe(false)
  expect(Buffer.concat(stdoutChunks).toString()).toBe('smoke-echo')
})

it('rejects with an authentication error for a wrong password', async () => {
  const outcome = await connectWithPassword({ password: WRONG_PASSWORD })

  expect(outcome).toBeInstanceOf(Error)
  expect((outcome as Error).message).toBe('All configured authentication methods failed')
})

it('rejects when the server closes the connection during authentication', async () => {
  isAuthFailureFollowedByClose = true
  try {
    const outcome = await connectWithPassword({ password: WRONG_PASSWORD })

    expect(outcome).toBeInstanceOf(Error)
    expect((outcome as Error).message).toContain('Connection closed before the SSH session was established')
  } finally {
    isAuthFailureFollowedByClose = false
  }
})

it('rejects with a relay error when the relay is unreachable', async () => {
  const relayUrl = process.env.EXPO_PUBLIC_SSH_RELAY_URL
  process.env.EXPO_PUBLIC_SSH_RELAY_URL = 'ws://127.0.0.1:1'
  vi.resetModules()
  try {
    const outcome = await connectWithPassword({ password: SMOKE_PASSWORD })

    expect(outcome).toBeInstanceOf(Error)
    expect((outcome as Error).message).toMatch(/Unable to reach the SSH relay/)
  } finally {
    process.env.EXPO_PUBLIC_SSH_RELAY_URL = relayUrl
  }
})
