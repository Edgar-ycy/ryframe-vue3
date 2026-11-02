import { readFileSync } from 'node:fs'
import { compileString } from 'sass'
import { describe, expect, it } from 'vitest'

const elementPlusStyles = readFileSync(
  new URL('../../src/styles/element-plus.scss', import.meta.url),
  'utf8',
)
const compiledStyles = compileString(elementPlusStyles).css
const darkStyles = compileString(
  readFileSync(new URL('../../src/styles/dark.scss', import.meta.url), 'utf8'),
).css

describe('Element Plus 全局样式', () => {
  it('主色链接按钮的全部交互态使用可读主色', () => {
    const selector = '.el-button.el-button--primary.is-link'
    expect(compiledStyles).toContain(`${selector} {`)

    for (const property of [
      '--el-button-text-color',
      '--el-button-hover-link-text-color',
      '--el-button-active-color',
      '--el-button-outline-color',
    ]) {
      expect(compiledStyles).toContain(`${property}: var(--color-primary-readable);`)
    }

    for (const state of [':hover', ':focus', ':focus-visible', ':active']) {
      expect(compiledStyles).toContain(`${selector}${state}`)
    }
    expect(compiledStyles).toContain('color: var(--color-primary-readable);')
  })

  it('暗色表格、弹窗、输入与禁用底色保留样式声明', () => {
    const compiled = `${compiledStyles}\n${darkStyles}`
    // 树、下拉项和标签由 permission-theme 浏览器用例检查实际明暗底色与文字对比度。
    // 以下风险尚无等价渲染断言，继续保留声明检查。
    for (const selector of [
      'html.dark .el-table {',
      'html.dark .el-dialog {',
      'html.dark .el-input__wrapper {',
    ]) {
      expect(compiled).toContain(selector)
    }
    for (const variable of ['--el-fill-color-lighter:', '--el-disabled-bg-color:']) {
      expect(compiled).toContain(variable)
    }
  })
})
