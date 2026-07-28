import { describe, expect, it } from 'vitest'
import { renderMarkdown } from './render'

describe('Markdown rendering', () => {
  it('renders supported Markdown and leaves raw HTML inert', () => {
    const html = renderMarkdown('# Title\n\n**safe** <script>alert(1)</script>')
    expect(html).toContain('<h1>Title</h1>')
    expect(html).toContain('<strong>safe</strong>')
    expect(html).not.toContain('<script>')
  })
})
