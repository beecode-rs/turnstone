import { Buffer } from 'buffer'
import {
  Client,
  type ClientChannel,
  type ConnectConfig,
  type FileEntryWithStats,
  type SFTPWrapper,
  type Stats,
} from 'ssh2'

import {
  type SshDirEntry,
  type SshExecHandle,
  type SshExecResult,
  type SshFileChunk,
  type SshFileStat,
  type SshHostKeyVerifier,
  type SshTransport,
  type SshTransportParams,
} from '#src/business/model/ssh-transport'
import { Ssh2Debug, type Ssh2SocketProbe } from '#src/lib/ssh2-debug'
import { constant } from '#src/util/constant'

interface SshExecState {
  channel: ClientChannel | null
  exitCode: number | null
  isCancelled: boolean
  signal: string | null
}

export class Ssh2ClientBase implements SshTransport {
  protected readonly _client: Client
  protected readonly _hostVerifier: SshHostKeyVerifier
  protected _sftpSessionPromise: Promise<SFTPWrapper> | null
  protected _isConnecting: boolean
  protected _isReady: boolean
  protected _socketProbe: Ssh2SocketProbe | null

  constructor(params: { hostVerifier: SshHostKeyVerifier }) {
    const { hostVerifier } = params
    this._hostVerifier = hostVerifier
    this._client = new Client()
    this._sftpSessionPromise = null
    this._isConnecting = false
    this._isReady = false
    this._socketProbe = null
    this._client.on('close', () => {
      this._onClientClosed()
    })
    this._client.on('error', (err) => {
      new Ssh2Debug().logClientError({ error: err })
    })
  }

  async connect(params: { connection: SshTransportParams }): Promise<void> {
    const { connection } = params
    this._assertConnectable()
    this._assertHasCredentials(connection)
    this._isConnecting = true
    try {
      await this._connectOnce(connection)
      this._isReady = true
    } finally {
      this._isConnecting = false
    }
  }

  disconnect(): void {
    this._client.end()
  }

  subscribeToClose(callback: () => void): () => void {
    this._client.on('close', callback)

    return () => {
      this._client.off('close', callback)
    }
  }

  exec(params: {
    command: string
    onStderrChunk: (chunk: Buffer) => void
    onStdoutChunk: (chunk: Buffer) => void
  }): SshExecHandle {
    const { command, onStderrChunk, onStdoutChunk } = params
    this._assertReady()
    const state: SshExecState = { channel: null, exitCode: null, isCancelled: false, signal: null }
    const result = new Promise<SshExecResult>((resolve, reject) => {
      this._client.exec(command, (err, channel) => {
        if (err) {
          reject(err)

          return
        }
        this._observeChannel({
          channel,
          onStderrChunk,
          onStdoutChunk,
          state,
        })
          .then(resolve)
          .catch(reject)
      })
    })

    return {
      cancel: () => {
        state.isCancelled = true
        if (state.channel) {
          state.channel.close()
        }
      },
      result,
    }
  }

  async readDir(params: { path: string }): Promise<SshDirEntry[]> {
    const { path } = params
    const sftp = await this._getSftpSession()
    const entries = await this._readdirEntries({ path, sftp })

    return entries.map((entry) => {
      return this._toDirEntry(entry)
    })
  }

  async lstat(params: { path: string }): Promise<SshFileStat> {
    const { path } = params
    const sftp = await this._getSftpSession()
    const stats = await this._lstatPath({ path, sftp })

    return {
      isDirectory: stats.isDirectory(),
      isSymbolicLink: stats.isSymbolicLink(),
      modifiedAtSeconds: stats.mtime,
      size: stats.size,
    }
  }

  async stat(params: { path: string }): Promise<SshFileStat> {
    const { path } = params
    const sftp = await this._getSftpSession()
    const stats = await this._statPath({ path, sftp })

    return {
      isDirectory: stats.isDirectory(),
      isSymbolicLink: stats.isSymbolicLink(),
      modifiedAtSeconds: stats.mtime,
      size: stats.size,
    }
  }

  async readRange(params: { length: number; offset: number; path: string }): Promise<SshFileChunk> {
    const { length, offset, path } = params
    const sftp = await this._getSftpSession()
    const handle = await this._openFile({ path, sftp })
    try {
      return await this._readFileRange({ handle, length, offset, sftp })
    } finally {
      this._closeFile({ handle, sftp })
    }
  }

  protected _assertConnectable(): void {
    if (this._isConnecting) {
      throw new Error('Ssh2Client connect is already in progress')
    }
    if (this._isReady) {
      throw new Error('Ssh2Client is already connected')
    }
  }

  protected _assertHasCredentials(connection: SshTransportParams): void {
    if (connection.password) {
      return
    }
    if (connection.privateKey) {
      return
    }
    throw new Error('Ssh2Client connect requires a password or a private key')
  }

  protected _assertReady(): void {
    if (this._isReady) {
      return
    }
    throw new Error('Ssh2Client operation requires a connected transport')
  }

  protected _connectOnce(connection: SshTransportParams): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this._socketProbe = null
      const removeListeners = (): void => {
        this._client.off('ready', onReady)
        this._client.off('error', onError)
        this._client.off('close', onClosed)
        this._client.off('end', onClosed)
      }
      const onReady = (): void => {
        removeListeners()
        resolve()
      }
      const onError = (err: Error): void => {
        removeListeners()
        reject(err)
      }
      const onClosed = (): void => {
        removeListeners()
        reject(new Error(`${constant.ssh.connectClosedMessage} (${this._toHandshakeFailureDetail({ connection })})`))
      }
      this._client.once('ready', onReady)
      this._client.once('error', onError)
      this._client.once('close', onClosed)
      this._client.once('end', onClosed)
      this._client.once('connect', () => {
        this._socketProbe = new Ssh2Debug().probeSocket({ client: this._client })
      })
      this._client.connect(this._toConnectConfig(connection))
    })
  }

  protected _toHandshakeFailureDetail(params: { connection: SshTransportParams }): string {
    const { connection } = params
    const snapshot = this._socketProbe?.snapshot()

    return new Ssh2Debug().toHandshakeFailureHint({
      firstChunkHex: snapshot?.firstChunkHex ?? null,
      host: connection.host,
      port: connection.port,
      receivedBytes: snapshot?.receivedBytes ?? 0,
    })
  }

  protected _toConnectConfig(connection: SshTransportParams): ConnectConfig {
    return {
      debug: new Ssh2Debug().toDebugLogger(),
      host: connection.host,
      hostVerifier: this._hostVerifier,
      keepaliveCountMax: constant.ssh.keepaliveCountMax,
      keepaliveInterval: constant.ssh.keepaliveIntervalMs,
      passphrase: connection.passphrase,
      password: connection.password,
      port: connection.port,
      privateKey: connection.privateKey,
      readyTimeout: constant.ssh.readyTimeoutMs,
      username: connection.username,
    }
  }

  protected _onClientClosed(): void {
    this._isReady = false
    this._sftpSessionPromise = null
  }

  protected _observeChannel(params: {
    channel: ClientChannel
    onStderrChunk: (chunk: Buffer) => void
    onStdoutChunk: (chunk: Buffer) => void
    state: SshExecState
  }): Promise<SshExecResult> {
    const { channel, onStderrChunk, onStdoutChunk, state } = params

    return new Promise<SshExecResult>((resolve) => {
      state.channel = channel
      if (state.isCancelled) {
        channel.close()
      }
      channel.on('data', (chunk: Buffer) => {
        onStdoutChunk(chunk)
      })
      channel.stderr.on('data', (chunk: Buffer) => {
        onStderrChunk(chunk)
      })
      channel.on('exit', (code: number | null, signal?: string) => {
        state.exitCode = code
        state.signal = signal ?? null
      })
      channel.on('close', () => {
        resolve({ exitCode: state.exitCode, isCancelled: state.isCancelled, signal: state.signal })
      })
    })
  }

  protected _getSftpSession(): Promise<SFTPWrapper> {
    this._assertReady()
    if (this._sftpSessionPromise) {
      return this._sftpSessionPromise
    }
    const sessionPromise = this._createSftpSession()
    void sessionPromise.catch(() => {
      this._sftpSessionPromise = null
    })
    this._sftpSessionPromise = sessionPromise

    return sessionPromise
  }

  protected async _createSftpSession(): Promise<SFTPWrapper> {
    const sftp = await new Promise<SFTPWrapper>((resolve, reject) => {
      this._client.sftp((err, sftpSession) => {
        if (err) {
          reject(err)

          return
        }
        resolve(sftpSession)
      })
    })
    sftp.on('close', () => {
      this._sftpSessionPromise = null
    })

    return sftp
  }

  protected _readdirEntries(params: { path: string; sftp: SFTPWrapper }): Promise<FileEntryWithStats[]> {
    const { path, sftp } = params

    return new Promise((resolve, reject) => {
      sftp.readdir(path, (err, list) => {
        if (err) {
          reject(err)

          return
        }
        resolve(list)
      })
    })
  }

  protected _lstatPath(params: { path: string; sftp: SFTPWrapper }): Promise<Stats> {
    const { path, sftp } = params

    return new Promise((resolve, reject) => {
      sftp.lstat(path, (err, stats) => {
        if (err) {
          reject(err)

          return
        }
        resolve(stats)
      })
    })
  }

  protected _statPath(params: { path: string; sftp: SFTPWrapper }): Promise<Stats> {
    const { path, sftp } = params

    return new Promise((resolve, reject) => {
      sftp.stat(path, (err, stats) => {
        if (err) {
          reject(err)

          return
        }
        resolve(stats)
      })
    })
  }

  protected _openFile(params: { path: string; sftp: SFTPWrapper }): Promise<Buffer> {
    const { path, sftp } = params

    return new Promise((resolve, reject) => {
      sftp.open(path, 'r', (err, handle) => {
        if (err) {
          reject(err)

          return
        }
        resolve(handle)
      })
    })
  }

  protected _readFileRange(params: {
    handle: Buffer
    length: number
    offset: number
    sftp: SFTPWrapper
  }): Promise<SshFileChunk> {
    const { handle, length, offset, sftp } = params

    return new Promise((resolve, reject) => {
      const buffer = Buffer.alloc(length)
      sftp.read(handle, buffer, 0, length, offset, (err, bytesRead, bytes) => {
        if (err) {
          reject(err)

          return
        }
        resolve({ bytes, bytesRead })
      })
    })
  }

  protected _closeFile(params: { handle: Buffer; sftp: SFTPWrapper }): void {
    const { handle, sftp } = params
    sftp.close(handle, () => {
      return undefined
    })
  }

  protected _toDirEntry(entry: FileEntryWithStats): SshDirEntry {
    return {
      filename: entry.filename,
      isDirectory: entry.attrs.isDirectory(),
      isSymbolicLink: entry.attrs.isSymbolicLink(),
      modifiedAtSeconds: entry.attrs.mtime,
      size: entry.attrs.size,
    }
  }
}
