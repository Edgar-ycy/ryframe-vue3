import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from './app'

describe('app responsive lifecycle', () => {
  let viewportWidth: number
  let resizeListener: (() => void) | undefined
  const addEventListener = vi.fn()
  const removeEventListener = vi.fn()

  beforeEach(() => {
    viewportWidth = 1280
    resizeListener = undefined
    addEventListener.mockReset()
    removeEventListener.mockReset()
    addEventListener.mockImplementation((type: string, listener: () => void) => {
      if (type === 'resize') resizeListener = listener
    })
    removeEventListener.mockImplementation((type: string, listener: () => void) => {
      if (type === 'resize' && resizeListener === listener) resizeListener = undefined
    })
    vi.stubGlobal('window', {
      get innerWidth() {
        return viewportWidth
      },
      addEventListener,
      removeEventListener,
    })
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('registers once, updates across the breakpoint, and removes the listener', () => {
    const store = useAppStore()

    store.initResponsive()
    store.initResponsive()
    expect(addEventListener).toHaveBeenCalledOnce()
    expect(store.isMobile).toBe(false)

    viewportWidth = 800
    resizeListener?.()
    expect(store.isMobile).toBe(true)
    expect(store.sidebarCollapsed).toBe(true)

    store.destroyResponsive()
    expect(removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
    expect(resizeListener).toBeUndefined()
    expect(store.responsiveInitialized).toBe(false)
  })

  it('can be initialized again after its owning layout is remounted', () => {
    const store = useAppStore()

    store.initResponsive()
    store.destroyResponsive()
    store.initResponsive()

    expect(addEventListener).toHaveBeenCalledTimes(2)
    expect(store.responsiveInitialized).toBe(true)
  })
})
