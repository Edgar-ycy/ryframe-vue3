import type { Directive } from 'vue'

/**
 * v-copy 一键复制指令
 * 用法: <span v-copy="'要复制的文本'">点击复制</span>
 *       <span v-copy="text">点击复制（默认300ms）</span>
 */
export const copy: Directive<HTMLElement, string> = {
  mounted(el, binding) {
    el.style.cursor = 'pointer'
    el.addEventListener('click', () => {
      const text = binding.value
      if (!text) return
      navigator.clipboard.writeText(text).then(() => {
        ElMessage.success('复制成功')
      }).catch(() => {
        // 降级方案
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        try {
          document.execCommand('copy')
          ElMessage.success('复制成功')
        } catch {
          ElMessage.error('复制失败')
        }
        document.body.removeChild(textarea)
      })
    })
  },
}

export default copy
