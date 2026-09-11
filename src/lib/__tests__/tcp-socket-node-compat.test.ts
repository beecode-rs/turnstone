// Supplements: ../tcp-socket-node-compat.ts
// Covers: pause guard against react-native-tcp-socket's native pause() throwing for sockets not yet registered on the native side (ssh2 calls pause before connecting), and error event normalization for native string error payloads (ssh2 assigns err.level on socket errors) - the react-native-tcp-socket module import cannot be mocked via contract.yaml

import { describe, expect, it, vi } from 'vitest'

vi.mock('react-native-tcp-socket', () => {
  return {
    default: {
      Socket: class {},
    },
  }
})

import { tcpSocketNodeCompat } from '#src/lib/tcp-socket-node-compat'

class FakeTcpSocket {
  nativePauseCallCount = 0
  _destroyed = false
  _paused = false
  _pending = true

  pause(): FakeTcpSocket {
    this._paused = true
    this.nativePauseCallCount += 1
    return this
  }
}

const createFakeTcpSocketClass = (): typeof FakeTcpSocket => {
  return class extends FakeTcpSocket {}
}

class FakeEmittingTcpSocket {
  emitCallCount = 0
  lastEvent = ''
  lastPayload: unknown = undefined

  emit(event: string, payload?: unknown): boolean {
    this.emitCallCount += 1
    this.lastEvent = event
    this.lastPayload = payload
    return true
  }
}

const createFakeEmittingTcpSocketClass = (): typeof FakeEmittingTcpSocket => {
  return class extends FakeEmittingTcpSocket {}
}

describe('tcpSocketNodeCompat pause guard', () => {
  it('keeps pause JS-only while the socket has never connected', () => {
    const socketClass = createFakeTcpSocketClass()
    tcpSocketNodeCompat.install(socketClass)
    const socket = new socketClass()

    const pausedSocket = socket.pause()

    expect(socket.nativePauseCallCount).toBe(0)
    expect(socket._paused).toBe(true)
    expect(pausedSocket).toBe(socket)
  })

  it('delegates pause to native once the socket is connected', () => {
    const socketClass = createFakeTcpSocketClass()
    tcpSocketNodeCompat.install(socketClass)
    const socket = new socketClass()
    socket._pending = false

    socket.pause()

    expect(socket.nativePauseCallCount).toBe(1)
    expect(socket._paused).toBe(true)
  })

  it('keeps pause JS-only after the socket is destroyed', () => {
    const socketClass = createFakeTcpSocketClass()
    tcpSocketNodeCompat.install(socketClass)
    const socket = new socketClass()
    socket._pending = false
    socket._destroyed = true

    socket.pause()

    expect(socket.nativePauseCallCount).toBe(0)
    expect(socket._paused).toBe(true)
  })

  it('delegates pause to native exactly once when install runs twice', () => {
    const socketClass = createFakeTcpSocketClass()
    tcpSocketNodeCompat.install(socketClass)
    tcpSocketNodeCompat.install(socketClass)
    const socket = new socketClass()
    socket._pending = false

    socket.pause()

    expect(socket.nativePauseCallCount).toBe(1)
    expect(socket._paused).toBe(true)
  })
})

describe('tcpSocketNodeCompat error event normalization', () => {
  it('wraps native string payloads into Error instances', () => {
    const socketClass = createFakeEmittingTcpSocketClass()
    tcpSocketNodeCompat.install(socketClass)
    const socket = new socketClass()

    const hasEmitted = socket.emit('error', 'Host unreachable')

    expect(hasEmitted).toBe(true)
    expect(socket.lastEvent).toBe('error')
    expect(socket.lastPayload).toBeInstanceOf(Error)
    expect((socket.lastPayload as Error).message).toBe('Host unreachable')
  })

  it('passes Error payloads through unchanged', () => {
    const socketClass = createFakeEmittingTcpSocketClass()
    tcpSocketNodeCompat.install(socketClass)
    const socket = new socketClass()
    const originalError = new Error('Connection refused')

    socket.emit('error', originalError)

    expect(socket.lastPayload).toBe(originalError)
  })

  it('keeps payloads of non-error events untouched', () => {
    const socketClass = createFakeEmittingTcpSocketClass()
    tcpSocketNodeCompat.install(socketClass)
    const socket = new socketClass()

    socket.emit('data', 'raw-bytes')

    expect(socket.lastEvent).toBe('data')
    expect(socket.lastPayload).toBe('raw-bytes')
  })

  it('copies message and code from object payloads', () => {
    const socketClass = createFakeEmittingTcpSocketClass()
    tcpSocketNodeCompat.install(socketClass)
    const socket = new socketClass()

    socket.emit('error', { code: 'ECONNREFUSED', message: 'Connection refused' })

    const payload = socket.lastPayload as Error & { code?: string }
    expect(socket.lastPayload).toBeInstanceOf(Error)
    expect(payload.message).toBe('Connection refused')
    expect(payload.code).toBe('ECONNREFUSED')
  })

  it('wraps emit exactly once when install runs twice', () => {
    const socketClass = createFakeEmittingTcpSocketClass()
    tcpSocketNodeCompat.install(socketClass)
    tcpSocketNodeCompat.install(socketClass)
    const socket = new socketClass()

    socket.emit('error', 'Host unreachable')

    expect(socket.emitCallCount).toBe(1)
  })
})
