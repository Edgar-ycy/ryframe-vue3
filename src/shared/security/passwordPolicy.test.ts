import { describe, expect, it } from 'vitest'
import {
  PASSWORD_POLICY,
  newPasswordValidationMessage,
} from './passwordPolicy'

describe('newPasswordValidationMessage', () => {
  const cases = [
    ['', false],
    ['Ab1!', false],
    ['abcdef1!', false],
    ['ABCDEF1!', false],
    ['Abcdefg!', false],
    ['Abcdefg1', false],
    ['Abc def1!', false],
    ['Abcdef1！', false],
    ['Abcdef1!', true],
    ['StrongP@ss1', true],
    [`Aa1!${'x'.repeat(69)}`, false],
  ] as const

  it.each(cases)('validates %j against the generated policy', (password, valid) => {
    expect(newPasswordValidationMessage(password) === null).toBe(valid)
    expect(new RegExp(PASSWORD_POLICY.pattern).test(password)).toBe(valid)
  })
})
