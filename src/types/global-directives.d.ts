import type { Directive } from 'vue'
import type { PermissionValue } from '@/utils/permission'

declare module '@vue/runtime-core' {
  export interface GlobalDirectives {
    /** v-perm 权限控制指令，用法: v-perm="'system:user:add'" */
    perm: Directive<HTMLElement, PermissionValue>
  }
}
