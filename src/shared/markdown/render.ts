import DOMPurify from 'dompurify'
import MarkdownIt from 'markdown-it'

const markdown = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
})

/** 将管理员编写的 Markdown 渲染为刻意受限且安全的 HTML 子集。 */
export function renderMarkdown(source: string): string {
  const rendered = markdown.render(source || '')
  if (typeof window === 'undefined') return rendered
  return DOMPurify.sanitize(rendered, {
    ALLOWED_TAGS: [
      'a', 'blockquote', 'br', 'code', 'del', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'hr', 'li', 'ol', 'p', 'pre', 'strong', 'table', 'tbody', 'td', 'th', 'thead', 'tr',
      'ul',
    ],
    ALLOWED_ATTR: ['href', 'title'],
  })
}
