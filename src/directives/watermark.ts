import type { Directive, DirectiveBinding } from 'vue'

interface WatermarkElement extends HTMLElement {
  _watermarkObserver?: MutationObserver
  _watermarkDiv?: HTMLDivElement
}

/**
 * 水印指令 v-watermark
 * 用法：v-watermark="'水印文字'" | v-watermark="{ text: '水印', fontSize: 18, color: '#000', rotate: -30, opacity: 0.1 }"
 */
const watermark: Directive = {
  mounted(el: WatermarkElement, binding: DirectiveBinding) {
    createWatermark(el, binding.value)
    // 监听 DOM 变化，防止删除水印
    const observer = new MutationObserver(() => {
      const watermarkDiv = el.querySelector('.__watermark__')
      if (!watermarkDiv) {
        createWatermark(el, binding.value)
      }
    })
    observer.observe(el, { childList: true, subtree: false })
    el._watermarkObserver = observer
  },

  updated(el: WatermarkElement, binding: DirectiveBinding) {
    removeWatermark(el)
    createWatermark(el, binding.value)
  },

  unmounted(el: WatermarkElement) {
    el._watermarkObserver?.disconnect()
    removeWatermark(el)
  },
}

function parseConfig(value: string | Record<string, any>) {
  if (typeof value === 'string') {
    return { text: value, fontSize: 18, color: 'rgba(0,0,0,0.1)', rotate: -30 }
  }
  return {
    text: value?.text || '',
    fontSize: value?.fontSize || 18,
    color: value?.color || 'rgba(0,0,0,0.1)',
    rotate: value?.rotate ?? -30,
    opacity: value?.opacity ?? 0.1,
  }
}

function createWatermark(el: WatermarkElement, value: string | Record<string, any>) {
  const config = parseConfig(value)
  if (!config.text) return

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  const ratio = window.devicePixelRatio || 1
  canvas.width = 300 * ratio
  canvas.height = 200 * ratio
  ctx.scale(ratio, ratio)

  ctx.font = `${config.fontSize}px sans-serif`
  ctx.fillStyle = config.color
  ctx.globalAlpha = config.opacity
  ctx.rotate((config.rotate * Math.PI) / 180)
  ctx.fillText(config.text, 20, canvas.height / ratio)

  const div = document.createElement('div')
  div.className = '__watermark__'
  div.style.cssText = `
    position: absolute; top: 0; left: 0; right: 0; bottom: 0;
    pointer-events: none; z-index: 9999;
    background: url(${canvas.toDataURL()}) repeat;
  `
  el.style.position = el.style.position || 'relative'
  el.appendChild(div)
  el._watermarkDiv = div
}

function removeWatermark(el: WatermarkElement) {
  const div = el.querySelector('.__watermark__')
  if (div) div.remove()
}

export default watermark
