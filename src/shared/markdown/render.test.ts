import { describe, expect, it } from 'vitest'
import { renderMarkdown } from './render'

describe('Markdown rendering', () => {
  it('renders supported Markdown and leaves raw HTML inert', () => {
    const html = renderMarkdown('# Title\n\n**safe** <script>alert(1)</script>')
    expect(html).toContain('<h1>Title</h1>')
    expect(html).toContain('<strong>safe</strong>')
    expect(html).not.toContain('<script>')
  })

  it('只保留安全链接协议并为链接添加隔离关系', () => {
    const html = renderMarkdown([
      '[站点](https://example.com)',
      '[邮件](mailto:ops@example.com)',
      '[相对路径](/profile)',
      '[脚本](javascript:alert(1))',
      '[数据](data:text/html;base64,PHNjcmlwdD4=)',
    ].join('\n\n'))

    expect(html.match(/rel="noopener noreferrer"/gu)).toHaveLength(3)
    expect(html).toContain('href="https://example.com"')
    expect(html).toContain('href="mailto:ops@example.com"')
    expect(html).toContain('href="/profile"')
    expect(html).not.toContain('href="javascript:')
    expect(html).not.toContain('href="data:')
  })
})
