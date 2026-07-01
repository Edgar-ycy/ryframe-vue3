import type { App, Directive } from 'vue'
import permission from './permission'
import debounce from './debounce'
import copy from './copy'
import throttle from './throttle'
import watermark from './watermark'
import lazy from './lazy'
import longpress from './longpress'

/** 所有自定义指令的注册表（key: 指令名, value: 指令定义） */
export const directiveMap: Record<string, Directive> = {
  perm: permission,
  debounce,
  copy,
  throttle,
  watermark,
  lazy,
  longpress,
}

export default {
  install(app: App) {
    for (const [name, directive] of Object.entries(directiveMap)) {
      app.directive(name, directive)
    }
  },
}
