import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearLegacyAuthStorage,
  getTenantId,
  removeTenantId,
  setTenantId,
} from './auth'

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()

  get length(): number { return this.values.size }
  clear(): void { this.values.clear() }
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null }
  removeItem(key: string): void { this.values.delete(key) }
  setItem(key: string, value: string): void { this.values.set(key, value) }
}

describe('browser auth storage', () => {
  let localStorage: MemoryStorage

  beforeEach(() => {
    localStorage = new MemoryStorage()
    vi.stubGlobal('window', { localStorage })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('removes legacy access and refresh tokens while preserving tenant selection', () => {
    localStorage.setItem('ryframe_token', 'access')
    localStorage.setItem('ryframe_refresh_token', 'refresh')
    localStorage.setItem('ryframe_tenant_id', 'tenant-a')

    clearLegacyAuthStorage()

    expect(localStorage.getItem('ryframe_token')).toBeNull()
    expect(localStorage.getItem('ryframe_refresh_token')).toBeNull()
    expect(getTenantId()).toBe('tenant-a')
  })

  it('persists only the selected tenant and falls back to system', () => {
    expect(getTenantId()).toBe('system')
    setTenantId('tenant-b')
    expect(getTenantId()).toBe('tenant-b')
    removeTenantId()
    expect(getTenantId()).toBe('system')

    setTenantId('')
    expect(getTenantId()).toBe('system')
  })

  it('is safe during server-side execution without window storage', () => {
    vi.unstubAllGlobals()

    expect(() => clearLegacyAuthStorage()).not.toThrow()
    expect(getTenantId()).toBe('system')
    expect(() => setTenantId('tenant-a')).not.toThrow()
    expect(() => removeTenantId()).not.toThrow()
  })
})
