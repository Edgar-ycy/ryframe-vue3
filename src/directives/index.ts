import type { App, Directive } from 'vue'
import permission from './permission'

/** 所有自定义指令的注册表（key: 指令名, value: 指令定义） */
export const directiveMap: Record<string, Directive> = {
  perm: permission,
}

export default {
  install(app: App) {
    for (const [name, directive] of Object.entries(directiveMap)) {
      app.directive(name, directive)
    }
  },
}
