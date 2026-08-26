import { readFileSync } from 'node:fs'
import { compileString } from 'sass'
import { describe, expect, it } from 'vitest'

const elementPlusStyles = readFileSync(
  new URL('../../src/styles/element-plus.scss', import.meta.url),
  'utf8',
)
const compiledStyles = compileString(elementPlusStyles).css

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
})
