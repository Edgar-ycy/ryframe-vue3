import policy from './noticePolicy.generated.json'

export const NOTICE_POLICY = Object.freeze(policy)

export type NoticeMarkdownValidation = 'required' | 'too_long' | null

export function noticeMarkdownUtf8Bytes(value: string): number {
  return new TextEncoder().encode(value).byteLength
}

export function validateNoticeMarkdown(value: string): NoticeMarkdownValidation {
  const byteLength = noticeMarkdownUtf8Bytes(value)
  if (byteLength < NOTICE_POLICY.content_markdown.min_utf8_bytes) return 'required'
  if (byteLength > NOTICE_POLICY.content_markdown.max_utf8_bytes) return 'too_long'
  return null
}
