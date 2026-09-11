import { Buffer } from 'buffer'

import { type SshExecResult, type SshTransport } from '#src/business/model/ssh-transport'
import { constant } from '#src/util/constant'
import { lineSplitUtil } from '#src/util/line-split-util'
import { shellQuoteUtil } from '#src/util/shell-quote-util'

export type RemoteExecLinesHandle = {
  cancel: () => void
  result: Promise<SshExecResult>
}

type ExecLinesState = {
  pendingTail: number[]
}

export class RemoteExecService {
  buildCommand(params: { command: string }): string {
    const { command } = params
    const pipeline = `${command} | head -c ${String(constant.remoteExec.maxOutputBytes)}`
    const guarded = this._toTimeoutGuardedCommand({ command: pipeline })

    return `LC_ALL=C sh -c ${this.quoteShellWord({ word: guarded })}`
  }

  protected _toTimeoutGuardedCommand(params: { command: string }): string {
    const { command } = params
    const quotedCommand = this.quoteShellWord({ word: command })
    const withTimeout = `exec timeout ${String(constant.remoteExec.commandTimeoutMs / 1000)} sh -c ${quotedCommand}`

    return `command -v timeout >/dev/null 2>&1 && ${withTimeout} || exec sh -c ${quotedCommand}`
  }

  execLines(params: {
    command: string
    onLine: (line: string) => void
    transport: SshTransport
  }): RemoteExecLinesHandle {
    const { command, onLine, transport } = params
    const state: ExecLinesState = { pendingTail: [] }
    const handle = transport.exec({
      command: this.buildCommand({ command }),
      onStderrChunk: () => {
        return undefined
      },
      onStdoutChunk: (chunk: Buffer) => {
        this._emitCompleteLines({ chunk, onLine, state })
      },
    })

    return {
      cancel: handle.cancel,
      result: handle.result.then((execResult: SshExecResult) => {
        this._flushPendingTail({ execResult, onLine, state })

        return execResult
      }),
    }
  }

  quoteShellWord(params: { word: string }): string {
    const { word } = params

    return shellQuoteUtil.quoteShellWord({ word })
  }

  protected _emitCompleteLines(params: { chunk: Buffer; onLine: (line: string) => void; state: ExecLinesState }): void {
    const { chunk, onLine, state } = params
    const split = lineSplitUtil.splitChunk({ chunk, pendingTail: state.pendingTail })
    state.pendingTail = split.pendingTail
    split.lines.forEach((lineBytes) => {
      onLine(this._decodeLineBytes({ lineBytes }))
    })
  }

  protected _flushPendingTail(params: {
    execResult: SshExecResult
    onLine: (line: string) => void
    state: ExecLinesState
  }): void {
    const { execResult, onLine, state } = params
    if (execResult.isCancelled) {
      return
    }
    const flushed = lineSplitUtil.flushLines({ pendingTail: state.pendingTail })
    state.pendingTail = []
    flushed.lines.forEach((lineBytes) => {
      onLine(this._decodeLineBytes({ lineBytes }))
    })
  }

  protected _decodeLineBytes(params: { lineBytes: number[] }): string {
    const { lineBytes } = params

    return Buffer.from(lineBytes).toString('utf8')
  }
}
