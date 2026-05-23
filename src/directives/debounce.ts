import type { Directive } from 'vue'

/**
 * v-debounce 防抖指令
 * 用法: <el-button v-debounce:500="handleClick">点击</el-button>
 *       <el-button v-debounce="handleClick">点击（默认300ms）</el-button>
 */
const debounceMap = new WeakMap<HTMLElement, () => void>()

export const debounce: Directive<HTMLElement, (...args: any[]) => void> = {
  mounted(el, binding) {
    const delay = Number(binding.arg) || 300
    const handler = binding.value
    if (typeof handler !== 'function') return

    let timer: ReturnType<typeof setTimeout> | null = null
    const debounced = (...args: any[]) => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => handler(...args), delay)
    }
    debounceMap.set(el, debounced)
    el.addEventListener('click', debounced)
  },
  unmounted(el) {
    const handler = debounceMap.get(el)
    if (handler) el.removeEventListener('click', handler)
  },
}

export default debounce
