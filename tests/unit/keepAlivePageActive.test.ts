import { beforeEach, describe, expect, it, vi } from 'vitest'

const lifecycle = vi.hoisted((): { activated?: () => void; deactivated?: () => void } => ({}))

vi.mock('vue', async (importOriginal) => {
  const vue = await importOriginal<typeof import('vue')>()
  return {
    ...vue,
    onActivated: (callback: () => void) => {
      lifecycle.activated = callback
    },
    onDeactivated: (callback: () => void) => {
      lifecycle.deactivated = callback
    },
  }
})

import { ref } from 'vue'
import { useKeepAlivePageActive } from '@/hooks/useKeepAlivePageActive'

describe('KeepAlive 页面活动状态', () => {
  beforeEach(() => {
    lifecycle.activated = undefined
    lifecycle.deactivated = undefined
  })

  it('离开时停用请求，重新激活时只刷新一次', async () => {
    const pageActive = ref(true)
    const refresh = vi.fn(async () => undefined)
    useKeepAlivePageActive(pageActive, refresh)

    lifecycle.deactivated?.()
    expect(pageActive.value).toBe(false)

    lifecycle.activated?.()
    expect(pageActive.value).toBe(true)
    expect(refresh).toHaveBeenCalledOnce()

    lifecycle.activated?.()
    expect(refresh).toHaveBeenCalledOnce()
  })
})
