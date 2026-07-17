import type { Directive } from 'vue'

declare module '@vue/runtime-core' {
  export interface GlobalDirectives {
    /** v-perm 权限控制指令，用法: v-perm="'user:add'" */
    perm: Directive<HTMLElement, string | string[]>
  }
}
