import type { Directive, DirectiveBinding } from 'vue'

interface LongPressElement extends HTMLElement {
  _longPressTimer?: ReturnType<typeof setTimeout>
  _longPressHandler?: EventListener
  _longPressEndHandler?: EventListener
}

/**
 * 长按指令 v-longpress
 * 用法：v-longpress:800="handler"（800ms 后触发，默认 500ms）
 */
const longpress: Directive = {
  mounted(el: LongPressElement, binding: DirectiveBinding) {
    const delay = binding.arg ? Number(binding.arg) : 500
    const handler = binding.value as (...args: any[]) => void
    if (typeof handler !== 'function') return

    let timer: ReturnType<typeof setTimeout>
    let isLongPress = false

    const startHandler: EventListener = (e) => {
      isLongPress = false
      e.preventDefault()
      timer = setTimeout(() => {
        isLongPress = true
        handler(e)
      }, delay)
      el._longPressTimer = timer
    }

    const endHandler: EventListener = () => {
      clearTimeout(timer)
      // 如果不是长按（是短按），可以触发 binding.modifiers.short 逻辑
    }

    el._longPressHandler = startHandler
    el._longPressEndHandler = endHandler

    el.addEventListener('mousedown', startHandler)
    el.addEventListener('touchstart', startHandler)
    el.addEventListener('mouseup', endHandler)
    el.addEventListener('mouseleave', endHandler)
    el.addEventListener('touchend', endHandler)
  },

  unmounted(el: LongPressElement) {
    if (el._longPressHandler) {
      el.removeEventListener('mousedown', el._longPressHandler)
      el.removeEventListener('touchstart', el._longPressHandler)
    }
    if (el._longPressEndHandler) {
      el.removeEventListener('mouseup', el._longPressEndHandler)
      el.removeEventListener('mouseleave', el._longPressEndHandler)
      el.removeEventListener('touchend', el._longPressEndHandler)
    }
    if (el._longPressTimer) {
      clearTimeout(el._longPressTimer)
    }
  },
}

export default longpress
