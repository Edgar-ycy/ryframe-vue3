import type { Directive, DirectiveBinding } from 'vue'

interface ThrottleElement extends HTMLElement {
  _throttleHandler?: EventListener
  _throttleTimer?: ReturnType<typeof setTimeout>
}

/**
 * 节流指令 v-throttle
 * 用法：v-throttle:500="handler" | v-throttle="handler"（默认 300ms）
 */
const throttle: Directive = {
  mounted(el: ThrottleElement, binding: DirectiveBinding) {
    const delay = binding.arg ? Number(binding.arg) : 300
    const handler = binding.value as (...args: any[]) => void
    if (typeof handler !== 'function') return

    let lastTime = 0

    const throttledHandler: EventListener = (...args) => {
      const now = Date.now()
      if (now - lastTime >= delay) {
        lastTime = now
        handler.apply(null, args)
      }
    }

    el._throttleHandler = throttledHandler
    el.addEventListener(binding.modifiers?.start ? 'mousedown' : 'click', throttledHandler)
  },

  unmounted(el: ThrottleElement) {
    if (el._throttleHandler) {
      el.removeEventListener('click', el._throttleHandler)
    }
  },
}

export default throttle
