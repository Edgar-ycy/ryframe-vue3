import { describe, expect, it, vi } from 'vitest'

import { createSensitiveMaterialScope } from '@/views/profile/components/ProfileServiceDelegationsCard.vue'

describe('个人服务委托一次性材料范围', () => {
  it('旧操作排队的 nextTick 不得在身份代次切换后重开对话框', () => {
    let createDialogVisible = true
    let materialDialogVisible = false
    let material: string | null = null
    let scheduledReveal: (() => void) | undefined
    const clearDialog = vi.fn()
    const scope = createSensitiveMaterialScope(
      {
        clearDialog,
        setCreateDialogVisible: (visible) => (createDialogVisible = visible),
        setMaterial: (value) => (material = value),
        setMaterialDialogVisible: (visible) => (materialDialogVisible = visible),
      },
      (effect) => {
        scheduledReveal = effect
        return Promise.resolve()
      },
    )

    const complete = scope.captureCompletion()
    complete('one-time-token')
    expect(createDialogVisible).toBe(false)
    expect(material).toBe('one-time-token')

    scope.clear()
    scheduledReveal?.()

    expect(clearDialog).toHaveBeenCalledOnce()
    expect(materialDialogVisible).toBe(false)
    expect(material).toBeNull()
  })
})
