import { describe, expect, it } from 'vitest'

import { buildGenerateRequest, isAbsoluteOutputPath } from './generationForm'

describe('code generation output path', () => {
  it.each([
    '/srv/ryframe-output',
    'D:/generated/ryframe',
    String.raw`D:\generated\ryframe`,
    String.raw`\\server\share\ryframe`,
  ])('accepts absolute path %s', (path) => {
    expect(isAbsoluteOutputPath(path)).toBe(true)
  })

  it.each(['', 'generated/ryframe', './generated', '../generated'])('rejects relative path %s', (path) => {
    expect(isAbsoluteOutputPath(path)).toBe(false)
  })

  it('builds the nested API request and trims the output path', () => {
    expect(buildGenerateRequest('sys_device', '  D:/generated/ryframe  ')).toEqual({
      output_dir: 'D:/generated/ryframe',
      options: { tables: ['sys_device'] },
    })
  })
})
