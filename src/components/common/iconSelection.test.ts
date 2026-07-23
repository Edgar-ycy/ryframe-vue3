import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useIconSelection } from './iconSelection'

describe('useIconSelection', () => {
  it('always reflects the current v-model value when the parent reuses the picker', () => {
    const modelValue = ref('Edit')
    const selection = useIconSelection(() => modelValue.value, vi.fn())

    expect(selection.selectedIcon.value).toBe('Edit')

    modelValue.value = 'Delete'
    expect(selection.selectedIcon.value).toBe('Delete')

    selection.openDialog()
    expect(selection.pendingIcon.value).toBe('Delete')
  })

  it('keeps pending changes local until confirmation and resets them on reopen', () => {
    const modelValue = ref('Edit')
    const updateModelValue = vi.fn((value: string) => {
      modelValue.value = value
    })
    const selection = useIconSelection(() => modelValue.value, updateModelValue)

    selection.openDialog()
    selection.selectIcon('Download')
    selection.closeDialog()

    expect(updateModelValue).not.toHaveBeenCalled()
    expect(selection.selectedIcon.value).toBe('Edit')

    selection.openDialog()
    expect(selection.pendingIcon.value).toBe('Edit')
    selection.selectIcon('Upload')
    selection.confirmSelection()

    expect(updateModelValue).toHaveBeenCalledWith('Upload')
    expect(selection.selectedIcon.value).toBe('Upload')
    expect(selection.dialogVisible.value).toBe(false)
  })
})
