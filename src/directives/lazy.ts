import type { Directive, DirectiveBinding } from 'vue'

/**
 * 图片懒加载指令 v-lazy
 * 用法：<img v-lazy="'image-url.jpg'" />
 * 可选：v-lazy:background（背景图模式）
 */
const lazy: Directive = {
  mounted(el: HTMLImageElement, binding: DirectiveBinding) {
    if (!binding.value) return

    const isBg = binding.arg === 'background'
    const placeholder = binding.modifiers?.placeholder ? 'data:image/svg+xml,...' : ''

    if (isBg) {
      el.style.backgroundImage = placeholder ? `url(${placeholder})` : ''
    } else {
      el.src = placeholder
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (isBg) {
              el.style.backgroundImage = `url(${binding.value})`
            } else {
              el.src = binding.value
              el.onload = () => el.classList.add('lazy-loaded')
            }
            observer.unobserve(el)
          }
        })
      },
      { rootMargin: '50px 0px', threshold: 0.01 },
    )

    observer.observe(el)
  },
}

export default lazy
