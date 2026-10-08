import { effectScope, ref } from 'vue'
import type { TableInstance } from 'element-plus'
import { afterEach, describe, expect, it, vi } from 'vitest'

const lifecycle = vi.hoisted(() => ({ deactivate: undefined as (() => void) | undefined }))
vi.mock('vue', async (loadActual) => ({
  ...(await loadActual<typeof import('vue')>()),
  onActivated: vi.fn(),
  onDeactivated: (callback: () => void) => {
    lifecycle.deactivate = callback
  },
}))

import { useExportRowSelection } from '@/hooks/useExportRowSelection'
import { deactivateServerStateScope, transitionServerStateScope } from '@/shared/query/client'

afterEach(() => deactivateServerStateScope())

function setup() {
  const scope = effectScope()
  const rows = ref([{ id: '1' }, { id: '9007199254740993' }])
  const loading = ref(false)
  const selection = scope.run(() =>
    useExportRowSelection(
      () => rows.value,
      () => loading.value,
      (row) => row.id,
    ),
  )!
  return { scope, rows, loading, selection }
}

describe('当前页导出选择', () => {
  it('只接受当前页的行并保留字符串 ID 精度', () => {
    const { scope, rows, selection } = setup()
    selection.handleExportSelectionChange([...rows.value, { id: 'other-page' }, rows.value[0]!])
    expect(selection.selectedExportIds.value).toEqual(['1', '9007199254740993'])
    scope.stop()
  })

  it('全选只遍历当前页的真实记录，加载期间不能选择', () => {
    const { scope, rows, loading, selection } = setup()
    const toggleRowSelection = vi.fn()
    selection.exportTableRef.value = {
      toggleRowSelection,
      clearSelection: vi.fn(),
    } as TableInstance
    selection.selectCurrentPage()
    expect(toggleRowSelection.mock.calls).toEqual(rows.value.map((row) => [row, true]))
    loading.value = true
    selection.selectCurrentPage()
    selection.handleExportSelectionChange(rows.value)
    expect(toggleRowSelection).toHaveBeenCalledTimes(2)
    expect(selection.selectedExportIds.value).toEqual([])
    scope.stop()
  })

  it('翻页、刷新和勾选变化使旧确认失效', () => {
    const { scope, rows, loading, selection } = setup()
    const old = selection.captureSelectionOwnership()
    selection.handleExportSelectionChange([rows.value[0]!])
    expect(old()).toBe(false)
    const selected = selection.captureSelectionOwnership()
    rows.value = [{ id: '3' }]
    expect(selected()).toBe(false)
    expect(selection.selectedExportIds.value).toEqual([])
    selection.handleExportSelectionChange(rows.value)
    loading.value = true
    expect(selection.selectedExportIds.value).toEqual([])
    scope.stop()
  })

  it('身份切换和 KeepAlive 离开都清理选择', () => {
    const { scope, rows, selection } = setup()
    selection.handleExportSelectionChange(rows.value)
    const old = selection.captureSelectionOwnership()
    transitionServerStateScope(
      { tenantId: 'tenant-b', subjectId: 'subject-b', authorizationFingerprint: 'b' },
      () => undefined,
      { force: true },
    )
    expect(selection.selectedExportIds.value).toEqual([])
    expect(old()).toBe(false)
    selection.handleExportSelectionChange(rows.value)
    lifecycle.deactivate?.()
    expect(selection.selectedExportIds.value).toEqual([])
    selection.handleExportSelectionChange(rows.value)
    expect(selection.selectedExportIds.value).toEqual([])
    scope.stop()
  })
})
