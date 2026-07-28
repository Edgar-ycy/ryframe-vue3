import type { Directive } from 'vue'
import { useUserStore } from '@/stores/user'
import { hasPermission, type PermissionValue } from '@/utils/permission'

interface PermissionDirectiveState {
  value: PermissionValue
  initialHidden: boolean
  initialAriaHidden: string | null
  initialInert: boolean
  initialDisabled?: boolean
  unsubscribe: () => void
}

const states = new WeakMap<HTMLElement, PermissionDirectiveState>()

function attribute(el: HTMLElement, name: string): string | null {
  return typeof el.getAttribute === 'function' ? el.getAttribute(name) : null
}

function setAttribute(el: HTMLElement, name: string, value: string): void {
  if (typeof el.setAttribute === 'function') el.setAttribute(name, value)
}

function removeAttribute(el: HTMLElement, name: string): void {
  if (typeof el.removeAttribute === 'function') el.removeAttribute(name)
}

function updateVisibility(el: HTMLElement, state: PermissionDirectiveState): void {
  const userStore = useUserStore()
  const allowed = !state.value || hasPermission(userStore.permissions, state.value, userStore.roles)
  const controlled = el as HTMLElement & { inert?: boolean; disabled?: boolean }

  if (allowed) {
    el.hidden = state.initialHidden
    if (state.initialAriaHidden === null) removeAttribute(el, 'aria-hidden')
    else setAttribute(el, 'aria-hidden', state.initialAriaHidden)
    controlled.inert = state.initialInert
    if (state.initialDisabled !== undefined) controlled.disabled = state.initialDisabled
    return
  }

  // 保留虚拟节点：移除由指令管理的元素会导致后续权限刷新无法安全地重新渲染它。
  el.hidden = true
  setAttribute(el, 'aria-hidden', 'true')
  controlled.inert = true
  if (state.initialDisabled !== undefined) controlled.disabled = true
}

const permissionDirective: Directive<HTMLElement, PermissionValue> = {
  mounted(el, binding) {
    const userStore = useUserStore()
    const controlled = el as HTMLElement & { inert?: boolean; disabled?: boolean }
    const state: PermissionDirectiveState = {
      value: binding.value,
      initialHidden: el.hidden === true,
      initialAriaHidden: attribute(el, 'aria-hidden'),
      initialInert: controlled.inert === true,
      initialDisabled: typeof controlled.disabled === 'boolean' ? controlled.disabled : undefined,
      unsubscribe: () => undefined,
    }
    state.unsubscribe = userStore.$subscribe(() => updateVisibility(el, state), { flush: 'sync' })
    states.set(el, state)
    updateVisibility(el, state)
  },

  updated(el, binding) {
    const state = states.get(el)
    if (!state) return
    state.value = binding.value
    updateVisibility(el, state)
  },

  beforeUnmount(el) {
    const state = states.get(el)
    state?.unsubscribe()
    states.delete(el)
  },
}

export default permissionDirective
