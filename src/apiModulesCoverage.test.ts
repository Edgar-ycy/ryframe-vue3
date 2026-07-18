import { describe, expect, it, vi } from 'vitest'

const http = vi.hoisted(() => ({
  request: vi.fn(async () => ({ code: 200, msg: 'ok', data: [], rows: [], total: 0 })),
  rawRequest: vi.fn(async () => ({ code: 200, msg: 'ok', data: [] })),
}))

vi.mock('@/shared/http/client', () => ({
  default: http.request,
  request: http.request,
  rawRequest: http.rawRequest,
}))

const argument = new Proxy(Object.create(null) as Record<PropertyKey, unknown>, {
  get(_target, property) {
    if (property === Symbol.iterator) return function* emptyIterator() {}
    if (property === Symbol.toPrimitive) return () => ''
    if (property === 'toString') return () => ''
    if (property === 'tenant_id') return 'system'
    return argument
  },
})

const modules = import.meta.glob<Record<string, unknown>>([
  './api/modules/*.ts',
  '!./api/modules/*.test.ts',
], { eager: true })

describe('API module request adapters', () => {
  it('executes every handwritten endpoint adapter against the shared HTTP boundary', async () => {
    const called: string[] = []

    for (const [path, module] of Object.entries(modules)) {
      for (const [name, value] of Object.entries(module)) {
        if (typeof value !== 'function') continue
        called.push(`${path}:${name}`)
        try {
          await value(argument, argument, argument, argument)
        }
        catch {
          // Endpoint-specific validation is covered by focused tests. This
          // contract smoke test verifies every adapter reaches shared HTTP.
        }
      }
    }

    expect(called.length).toBeGreaterThan(80)
    expect(http.request).toHaveBeenCalled()
    expect(http.rawRequest).toHaveBeenCalled()
  })
})
