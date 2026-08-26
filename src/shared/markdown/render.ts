import DOMPurify from 'dompurify'
import MarkdownIt from 'markdown-it'

const markdown = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
})

const SAFE_LINK_PROTOCOLS = new Set(['http', 'https', 'mailto', 'tel'])

/** 仅允许站内相对链接及明确批准的外部协议。 */
function isSafeLink(value: string): boolean {
  const normalized = value.trim()
  if (normalized.startsWith('//') || normalized.startsWith('\\')) return false
  const scheme = /^([a-z][a-z\d+.-]*):/iu.exec(normalized)?.[1]?.toLowerCase()
  return scheme === undefined || SAFE_LINK_PROTOCOLS.has(scheme)
}

markdown.validateLink = isSafeLink
markdown.renderer.rules.link_open = (tokens, index, options, _environment, renderer) => {
  tokens[index].attrSet('rel', 'noopener noreferrer')
  return renderer.renderToken(tokens, index, options)
}

/** 将管理员编写的 Markdown 渲染为刻意受限且安全的 HTML 子集。 */
export function renderMarkdown(source: string): string {
  const rendered = markdown.render(source || '')
  if (typeof window === 'undefined') return rendered
  return DOMPurify.sanitize(rendered, {
    ALLOWED_TAGS: [
      'a',
      'blockquote',
      'br',
      'code',
      'del',
      'em',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'hr',
      'li',
      'ol',
      'p',
      'pre',
      'strong',
      'table',
      'tbody',
      'td',
      'th',
      'thead',
      'tr',
      'ul',
    ],
    ALLOWED_ATTR: ['href', 'rel', 'title'],
  })
}
