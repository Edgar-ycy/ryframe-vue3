import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(
  new URL('../../src/views/system/user/components/UserFormDialog.vue', import.meta.url),
  'utf8',
)

describe('用户表单部门树', () => {
  it('显式用部门 ID 作为节点值，避免空 option value 警告', () => {
    expect(source).toContain(
      "const departmentTreeProps = { value: 'id', label: 'name', children: 'children' } as const",
    )
    expect(source).toContain(':props="departmentTreeProps"')
  })
})
