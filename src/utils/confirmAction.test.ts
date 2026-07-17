import { ElMessageBox } from 'element-plus'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { confirmAction, isConfirmationCancellation } from './confirmAction'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('isConfirmationCancellation', () => {
  it('recognizes only Element Plus cancellation actions', () => {
    expect(isConfirmationCancellation('cancel')).toBe(true)
    expect(isConfirmationCancellation('close')).toBe(true)
    expect(isConfirmationCancellation(new Error('request failed'))).toBe(false)
  })

  it('returns true after confirmation', async () => {
    vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue({} as never)

    await expect(confirmAction('message', 'title')).resolves.toBe(true)
  })

  it('returns false for a cancelled dialog', async () => {
    vi.spyOn(ElMessageBox, 'confirm').mockRejectedValue('cancel')

    await expect(confirmAction('message', 'title')).resolves.toBe(false)
  })

  it('preserves unexpected failures', async () => {
    const error = new Error('dialog failed')
    vi.spyOn(ElMessageBox, 'confirm').mockRejectedValue(error)

    await expect(confirmAction('message', 'title')).rejects.toBe(error)
  })
})
