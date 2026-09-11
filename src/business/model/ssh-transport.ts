import { type Buffer } from 'buffer'

export type SshHostKeyVerifier = (key: Buffer, verify: (isValid: boolean) => void) => void

export type SshTransportParams = {
  host: string
  port: number
  username: string
  password?: string
  privateKey?: string
  passphrase?: string
}

export type SshExecResult = {
  exitCode: number | null
  signal: string | null
  isCancelled: boolean
}

export type SshExecHandle = {
  result: Promise<SshExecResult>
  cancel: () => void
}

export type SshDirEntry = {
  filename: string
  isDirectory: boolean
  isSymbolicLink: boolean
  size: number
  modifiedAtSeconds: number
}

export type SshFileStat = {
  isDirectory: boolean
  isSymbolicLink: boolean
  size: number
  modifiedAtSeconds: number
}

export type SshFileChunk = {
  bytes: Buffer
  bytesRead: number
}

export interface SshTransport {
  connect(params: { connection: SshTransportParams }): Promise<void>
  disconnect(): void
  subscribeToClose(callback: () => void): () => void
  exec(params: {
    command: string
    onStderrChunk: (chunk: Buffer) => void
    onStdoutChunk: (chunk: Buffer) => void
  }): SshExecHandle
  readDir(params: { path: string }): Promise<SshDirEntry[]>
  lstat(params: { path: string }): Promise<SshFileStat>
  stat(params: { path: string }): Promise<SshFileStat>
  readRange(params: { length: number; offset: number; path: string }): Promise<SshFileChunk>
}
