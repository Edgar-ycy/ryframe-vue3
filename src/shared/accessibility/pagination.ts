import type { Directive } from 'vue'

function labelPageSizeControl(root: HTMLElement, label: string): void {
  const control = root.querySelector<HTMLElement>('.el-pagination__sizes [role="combobox"]')
  if (control) control.setAttribute('aria-label', label)
}

/** 为 Element Plus 分页器内部的每页条数选择器补充可访问名称。 */
export const paginationA11yDirective: Directive<HTMLElement, string> = {
  mounted(element, binding) {
    labelPageSizeControl(element, binding.value)
  },
  updated(element, binding) {
    labelPageSizeControl(element, binding.value)
  },
}
