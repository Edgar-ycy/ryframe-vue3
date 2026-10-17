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

  it('暗色覆盖表格、树、选择器、弹窗、输入与标签', () => {
    const compiled = `${compiledStyles}\n${darkStyles}`
    for (const selector of [
      'html.dark .el-table {',
      'html.dark .el-tree {',
      'html.dark .el-select-dropdown {',
      'html.dark .el-select-dropdown__item {',
      'html.dark .el-dialog {',
      'html.dark .el-input__wrapper {',
      'html.dark .el-tag {',
      'html.dark .el-tag--success {',
      'html.dark .el-tag--danger,',
    ]) {
      expect(compiled).toContain(selector)
    }
    for (const variable of [
      '--el-fill-color-lighter:',
      '--el-disabled-bg-color:',
      '--el-select-option-hover-background:',
      '--el-tree-node-hover-bg-color:',
    ]) {
      expect(compiled).toContain(variable)
    }
  })
})
