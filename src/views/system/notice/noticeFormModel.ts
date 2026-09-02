import type { FormItemRule, FormRules } from 'element-plus'
import { NOTICE_POLICY, validateNoticeMarkdown } from '@/shared/markdown/noticePolicy'

export interface NoticeForm {
  title: string
  notice_type: string
  content_markdown: string
  status: string
}

type Translate = (key: string, params?: Record<string, unknown>) => string

export function createEmptyNoticeForm(): NoticeForm {
  return { title: '', notice_type: 'notice', content_markdown: '', status: '1' }
}

export function createNoticeRules(t: Translate): FormRules {
  const validateMarkdown: FormItemRule['validator'] = (_rule, value, callback) => {
    const result = validateNoticeMarkdown(typeof value === 'string' ? value : '')
    if (result === 'required') callback(new Error(t('system.notice.enterContent')))
    else if (result === 'too_long') {
      callback(
        new Error(
          t('system.notice.contentTooLong', {
            max: NOTICE_POLICY.content_markdown.max_utf8_bytes,
          }),
        ),
      )
    } else callback()
  }
  return {
    title: [{ required: true, message: t('system.notice.enterTitle'), trigger: 'blur' }],
    content_markdown: [{ validator: validateMarkdown, trigger: 'blur' }],
  }
}
