import { describe, expect, it, vi } from 'vitest'
import { confirmExportIntent, normalizeExportIntent } from '@/app/exports/exportIntent'

describe('normalizeExportIntent', () => {
  it('去除分页和空值并裁剪字符串', () => {
    const intent = normalizeExportIntent('users', {
      username: '  alice  ',
      phone: '   ',
      page: 3,
      page_size: 20,
      ignored: null,
      missing: undefined,
    })

    expect(intent.filter).toEqual({ username: 'alice' })
    expect(intent.isEmpty).toBe(false)
    expect(intent.signature).toBe('users:{"filter":{"username":"alice"},"ids":[]}')
  })

  it('保留0和false并生成稳定意图', () => {
    const first = normalizeExportIntent('users', {
      status: false,
      dept_id: 0,
      username: ' alice ',
    })
    const second = normalizeExportIntent('users', {
      username: 'alice',
      dept_id: 0,
      status: false,
    })

    expect(first.filter).toEqual({ dept_id: 0, status: false, username: 'alice' })
    expect(first.signature).toBe(second.signature)
  })

  it('将仅含分页和空值的查询视为空筛选', () => {
    const intent = normalizeExportIntent('roles', {
      page: 1,
      page_size: 10,
      name: ' ',
      status: undefined,
    })

    expect(intent.filter).toEqual({})
    expect(intent.isEmpty).toBe(true)
    expect(intent.signature).toBe('roles:{"filter":{},"ids":[]}')
  })

  it('选中行优先限制结果，字符串 ID 保留精度并固定快照', async () => {
    const selected = ['9007199254740993', '2', '2']
    const intent = normalizeExportIntent('users', { page: 2, page_size: 10 }, selected)
    selected.push('3')
    expect(intent.ids).toEqual(['2', '9007199254740993'])
    expect(intent.isEmpty).toBe(false)
    const confirmation = vi.fn(async () => false)
    await expect(confirmExportIntent(intent, confirmation)).resolves.toBe(true)
    expect(confirmation).not.toHaveBeenCalled()
    expect(intent.signature).toBe(
      normalizeExportIntent('users', {}, ['2', '9007199254740993']).signature,
    )
    expect(intent.signature).not.toBe(normalizeExportIntent('users', {}, ['2']).signature)
  })
})

describe('confirmExportIntent', () => {
  it('空筛选确认后允许提交', async () => {
    const requestConfirmation = vi.fn(async () => true)

    await expect(confirmExportIntent({ isEmpty: true }, requestConfirmation)).resolves.toBe(true)
    expect(requestConfirmation).toHaveBeenCalledOnce()
  })

  it('空筛选取消后不允许提交', async () => {
    const requestConfirmation = vi.fn(async () => false)

    await expect(confirmExportIntent({ isEmpty: true }, requestConfirmation)).resolves.toBe(false)
    expect(requestConfirmation).toHaveBeenCalledOnce()
  })

  it('非空筛选不显示二次确认', async () => {
    const requestConfirmation = vi.fn(async () => false)

    await expect(confirmExportIntent({ isEmpty: false }, requestConfirmation)).resolves.toBe(true)
    expect(requestConfirmation).not.toHaveBeenCalled()
  })
})
