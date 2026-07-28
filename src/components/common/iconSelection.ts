import { computed, ref, type ComputedRef, type Ref } from 'vue'

export interface IconSelection {
  dialogVisible: Ref<boolean>
  pendingIcon: Ref<string>
  selectedIcon: ComputedRef<string>
  closeDialog(): void
  confirmSelection(): void
  openDialog(): void
  selectIcon(icon: string): void
}

/** 在隔离对话框待提交编辑的同时，仍由其 v-model 控制图标选择器。 */
export function useIconSelection(
  getModelValue: () => string | undefined,
  updateModelValue: (value: string) => void,
): IconSelection {
  const dialogVisible = ref(false)
  const pendingIcon = ref('')
  const selectedIcon = computed(() => getModelValue() ?? '')

  function openDialog(): void {
    pendingIcon.value = selectedIcon.value
    dialogVisible.value = true
  }

  function closeDialog(): void {
    dialogVisible.value = false
  }

  function selectIcon(icon: string): void {
    pendingIcon.value = icon
  }

  function confirmSelection(): void {
    updateModelValue(pendingIcon.value)
    closeDialog()
  }

  return {
    closeDialog,
    confirmSelection,
    dialogVisible,
    openDialog,
    pendingIcon,
    selectedIcon,
    selectIcon,
  }
}
