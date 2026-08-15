import type { App } from 'vue'
import { HttpError } from '@/shared/http/client'

interface ErrorContext {
  source: 'vue' | 'window.error' | 'unhandledrejection'
  info?: string
  file?: string
  line?: number
  column?: number
}

const reportedErrors = new WeakSet<object>()

function redact(value: string): string {
  return value
    .replace(
      /(["']?authorization["']?\s*[:=]\s*)(?:bearer\s+)?(?:["'][^"']*["']|[^\s,;&}\]]+)/giu,
      '$1[REDACTED]',
    )
    .replace(
      /(["']?cookie["']?\s*[:=]\s*)(?:["'][^"']*["']|[^\r\n,}]*)/giu,
      '$1[REDACTED]',
    )
    .replace(
      /(["']?(?:password|secret|ticket|token|(?:access|refresh|id|csrf|websocket)[_-]?token|x[-_]?csrf[-_]?token)["']?\s*[:=]\s*)(?:bearer\s+)?(?:["'][^"']*["']|[^\s,;&}\]]+)/giu,
      '$1[REDACTED]',
    )
    .replace(/\bbearer\s+[A-Za-z0-9._~+/=-]+/giu, 'Bearer [REDACTED]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/gu, '[REDACTED]')
}

function redactContext(context: ErrorContext): ErrorContext {
  return {
    source: context.source,
    info: context.info ? redact(context.info) : undefined,
    file: context.file ? redact(context.file) : undefined,
    line: context.line,
    column: context.column,
  }
}

function describeUnknownError(error: unknown): string {
  if (typeof error === 'string') return error
  if (typeof error === 'object' && error !== null) {
    const candidate = (error as { message?: unknown }).message
    if (typeof candidate === 'string' && candidate.trim()) return candidate
    try {
      const serialized = JSON.stringify(error)
      if (serialized !== undefined) return serialized
    }
    catch {
      // 循环引用等无法序列化的对象退回 toString。
    }
  }
  return String(error)
}

function reportUnhandled(error: unknown, context: ErrorContext): void {
  // HTTP 错误由 Query 和会话层统一提示，避免同一个失败重复输出。
  if (error instanceof HttpError) return
  if (typeof error === 'object' && error !== null) {
    if (reportedErrors.has(error)) return
    reportedErrors.add(error)
  }

  if (import.meta.env.DEV) {
    const details = error instanceof Error
      ? {
          name: redact(error.name),
          message: redact(error.message),
          stack: error.stack ? redact(error.stack) : undefined,
        }
      : { message: redact(describeUnknownError(error)) }
    console.error('[RyFrame] 未捕获运行时错误', details, redactContext(context))
    return
  }
  console.error('[RyFrame] 未捕获运行时错误')
}

export function installGlobalErrorHandlers(app: App): void {
  app.config.errorHandler = (error, _instance, info) => {
    reportUnhandled(error, { source: 'vue', info })
  }

  window.addEventListener('error', (event) => {
    reportUnhandled(event.error ?? event.message, {
      source: 'window.error',
      file: event.filename || undefined,
      line: event.lineno || undefined,
      column: event.colno || undefined,
    })
    event.preventDefault()
  })
  window.addEventListener('unhandledrejection', (event) => {
    reportUnhandled(event.reason, { source: 'unhandledrejection' })
    event.preventDefault()
  })
}
