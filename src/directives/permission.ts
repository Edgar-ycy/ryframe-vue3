import type { Directive } from 'vue'
import { useUserStore } from '@/stores/user'
import { hasPermission, type PermissionValue } from '@/utils/permission'

const permissionDirective: Directive<HTMLElement, PermissionValue> = {
  mounted(el, binding) {
    const { value } = binding
    if (!value) return

    const userStore = useUserStore()
    if (!hasPermission(userStore.permissions, value, userStore.roles)) {
      el.parentNode?.removeChild(el)
    }
  },
}

export default permissionDirective
