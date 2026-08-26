import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const sidebarSource = readFileSync(
  new URL('../../src/components/layout/Sidebar/index.vue', import.meta.url),
  'utf8',
)

describe('布局可访问性契约', () => {
  it('侧栏滚动区域可以通过键盘获得焦点', () => {
    expect(sidebarSource).toMatch(/<el-scrollbar\s+:tabindex="0">/u)
  })
})
