import process from 'node:process'

export function signalExitCode(signal) {
  return signal === 'SIGINT' ? 130 : signal === 'SIGTERM' ? 143 : undefined
}

/** 一次任务图的停止原因不可覆盖；第二次中断或宽限期结束进入强制阶段。 */
export class TaskRunControl {
  #abort = new AbortController()
  #force = new AbortController()
  #stoppers = new Set()
  #timer
  #cause
  #interrupts = 0
  #gracePeriodMs

  constructor({ gracePeriodMs = 1000 } = {}) {
    this.#gracePeriodMs = gracePeriodMs
  }

  get signal() {
    return this.#abort.signal
  }

  get forceSignal() {
    return this.#force.signal
  }

  get exitCode() {
    return this.#cause?.exitCode
  }

  ownsFailure(result) {
    return this.#cause?.result === result
  }

  fail(result) {
    if (this.#cause) return
    this.#stop({
      kind: 'failure',
      exitCode: signalExitCode(result.signal) ?? (result.code || 1),
      signal: 'SIGTERM',
      result,
    })
  }

  interrupt(signal) {
    this.#interrupts += 1
    if (!this.#cause) this.#stop({ kind: 'interrupt', exitCode: signalExitCode(signal), signal })
    if (this.#interrupts > 1) this.#forceStop()
  }

  register(stop) {
    this.#stoppers.add(stop)
    if (this.signal.aborted) stop(this.#force.signal.aborted ? 'SIGKILL' : this.#cause.signal)
    return () => this.#stoppers.delete(stop)
  }

  #stop(cause) {
    this.#cause = cause
    this.#abort.abort(cause)
    for (const stop of this.#stoppers) stop(cause.signal)
    this.#timer = setTimeout(() => this.#forceStop(), this.#gracePeriodMs)
    this.#timer.unref()
  }

  #forceStop() {
    if (this.forceSignal.aborted) return
    clearTimeout(this.#timer)
    this.#force.abort(this.#cause)
    for (const stop of this.#stoppers) stop('SIGKILL')
  }

  dispose() {
    clearTimeout(this.#timer)
    this.#stoppers.clear()
  }
}

export async function withTaskSignals(action, control, signals = process) {
  const handlers = new Map(
    ['SIGINT', 'SIGTERM'].map((signal) => [signal, () => control.interrupt(signal)]),
  )
  for (const [signal, handler] of handlers) signals.on(signal, handler)
  try {
    return await action()
  } finally {
    for (const [signal, handler] of handlers) signals.off(signal, handler)
    control.dispose()
  }
}
