import { describe, expect, it } from 'vitest'
import {
  NOTICE_POLICY,
  noticeMarkdownUtf8Bytes,
  validateNoticeMarkdown,
} from './noticePolicy'

describe('validateNoticeMarkdown', () => {
  it('uses the generated UTF-8 byte policy', () => {
    expect(NOTICE_POLICY.content_markdown).toEqual({
      min_utf8_bytes: 1,
      max_utf8_bytes: 60_000,
    })
    expect(validateNoticeMarkdown('')).toBe('required')
    expect(validateNoticeMarkdown('a'.repeat(60_000))).toBeNull()
    expect(validateNoticeMarkdown('a'.repeat(60_001))).toBe('too_long')
  })

  it('counts multibyte Markdown content by UTF-8 bytes', () => {
    expect(noticeMarkdownUtf8Bytes('中')).toBe(3)
    expect(validateNoticeMarkdown('中'.repeat(20_000))).toBeNull()
    expect(validateNoticeMarkdown('中'.repeat(20_001))).toBe('too_long')
  })
})
