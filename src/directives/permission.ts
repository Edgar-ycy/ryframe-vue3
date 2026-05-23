import type { Directive, App } from 'vue'
import { useUserStore } from '@/stores/user'

const permissionDirective: Directive<HTMLElement, string> = {
  mounted(el, binding) {
    const { value } = binding
    if (value) {
      const userStore = useUserStore()
      const hasPermission = userStore.permissions.includes(value)
      if (!hasPermission) {
        el.parentNode?.removeChild(el)
      }
    }
  },
}

export default permissionDirective
