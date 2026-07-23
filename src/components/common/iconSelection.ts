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

/** Keep the picker controlled by its v-model while isolating pending dialog edits. */
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
