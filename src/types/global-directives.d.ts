import type { Directive } from 'vue'

declare module '@vue/runtime-core' {
  export interface GlobalDirectives {
    /** v-permission 权限控制指令，用法: v-permission="'user:add'" */
    permission: Directive<HTMLElement, string | string[]>
    /** v-debounce 防抖指令，用法: v-debounce:500="handleClick" */
    debounce: Directive<HTMLElement, (...args: any[]) => void>
    /** v-copy 一键复制指令，用法: v-copy="'要复制的文本'" */
    copy: Directive<HTMLElement, string>
    /** v-throttle 节流指令，用法: v-throttle:500="handler" */
    throttle: Directive<HTMLElement, (...args: any[]) => void>
    /** v-watermark 水印指令，用法: v-watermark="'水印文字'" */
    watermark: Directive<HTMLElement, string | Record<string, any>>
    /** v-lazy 图片懒加载指令，用法: v-lazy="'image-url.jpg'" */
    lazy: Directive<HTMLElement, string>
    /** v-longpress 长按指令，用法: v-longpress:800="handler" */
    longpress: Directive<HTMLElement, (...args: any[]) => void>
  }
}
