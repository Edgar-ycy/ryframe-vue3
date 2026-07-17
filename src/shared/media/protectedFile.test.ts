import { describe, expect, it } from 'vitest'
import { parseProtectedFileUrl } from './protectedFile'

describe('parseProtectedFileUrl', () => {
  it('parses the private object locator returned by the backend', () => {
    expect(parseProtectedFileUrl(
      '/api/v1/common/file/download?bucket=avatar&path=system%2F2026%2F07%2F17%2Favatar.png',
    )).toEqual({
      bucket: 'avatar',
      path: 'system/2026/07/17/avatar.png',
    })
  })

  it('accepts an absolute API URL and an omitted bucket', () => {
    expect(parseProtectedFileUrl(
      'https://api.example.com/api/v1/common/file/download?path=system/avatar.png',
    )).toEqual({ path: 'system/avatar.png' })
  })

  it.each([
    '',
    'https://cdn.example.com/avatar.png',
    '/api/v1/common/file/download?bucket=avatar',
    'not a valid url%',
  ])('leaves a non-protected image URL unchanged: %s', (value) => {
    expect(parseProtectedFileUrl(value)).toBeNull()
  })
})
