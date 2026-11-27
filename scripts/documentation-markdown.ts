const listMarker = /^(?:[-+*]|\d{1,9}[.)])[ \t]+/u
const quoteMarker = /^[ \t]*>[ \t]?/u
const containerMarker = /^[ \t]*(?:>[ \t]?|(?:[-+*]|\d{1,9}[.)])[ \t]+)/u
const shellLanguages = new Set(['powershell', 'pwsh', 'sh', 'bash', 'shell'])

interface MarkdownDocument {
  prose: string
  blocks: [language: string, body: string][]
  headings: [level: number, heading: string][]
  bullets: number
}

interface Fence {
  marker: string
  language: string
  quotes: number
  margin: number
  body: string
}

function nextColumn(column: number, character: string): number {
  return column + (character === '\t' ? 4 - (column % 4) : 1)
}

function indentation(text: string): number {
  return [...text].reduce(nextColumn, 0)
}

function lineLayout(line: string) {
  const prefix = /^[ \t]*/u.exec(line)?.[0] ?? ''
  return { text: line.slice(prefix.length), column: indentation(prefix) }
}

function removeIndent(line: string, margin: number): string {
  let column = 0
  let index = 0
  while (column < margin && /^[ \t]$/u.test(line[index] ?? '')) {
    column = nextColumn(column, line[index])
    index += 1
  }
  return ' '.repeat(Math.max(0, column - margin)) + line.slice(index)
}

function exampleContainer(line: string, marker: RegExp, quoteLimit = Infinity) {
  let quotes = 0
  let margin = 0
  for (let match = marker.exec(line); match && quotes < quoteLimit; match = marker.exec(line)) {
    const prefix = match[0]
    if (prefix.trimStart().startsWith('>')) {
      quotes += 1
      margin = 0
    } else {
      margin += indentation(prefix)
    }
    line = line.slice(prefix.length)
  }
  return { line, quotes, margin }
}

function openFence(line: string, quoteDepth: number, listMargin: number): Fence | undefined {
  const container = exampleContainer(line, containerMarker)
  const opening = /^(`{3,}|~{3,})(.*)$/u.exec(container.line.trimStart())
  if (!opening) return undefined
  return {
    marker: opening[1],
    language: opening[2].trim().toLowerCase(),
    quotes: container.quotes,
    margin: container.margin || (container.quotes === quoteDepth ? listMargin : 0),
    body: '',
  }
}

function fenceLine(
  fence: Fence,
  line: string,
  preserveShellComments: boolean,
): 'unclosed' | 'closed' | 'body' {
  const quote = exampleContainer(line, quoteMarker, fence.quotes)
  const { text, column } = lineLayout(quote.line)
  if (quote.quotes < fence.quotes || (text && column < fence.margin)) return 'unclosed'
  if (text.startsWith(fence.marker) && text.replaceAll(fence.marker[0], '').trim() === '') {
    return 'closed'
  }
  if (preserveShellComments || !shellLanguages.has(fence.language) || !text.startsWith('#')) {
    fence.body += removeIndent(quote.line, fence.margin) + '\n'
  }
  return 'body'
}

export function markdown(
  source: string,
  { preserveShellComments = false }: { preserveShellComments?: boolean } = {},
): MarkdownDocument {
  const document: MarkdownDocument = { prose: '', blocks: [], headings: [], bullets: 0 }
  let fence: Fence | undefined
  let indented: string | undefined
  let gap = 0
  let depth = 0
  let boundary = true
  const margins: number[] = []
  const closeIndented = () => {
    if (indented !== undefined) document.blocks.push(['indented', indented])
    indented = undefined
    gap = 0
  }
  for (const line of source.split(/\r?\n/u)) {
    if (fence) {
      const status = fenceLine(fence, line, preserveShellComments)
      if (status === 'body') continue
      const language = status === 'closed' ? fence.language : `unclosed:${fence.language}`
      document.blocks.push([language, fence.body])
      fence = undefined
      boundary = true
      if (status === 'closed') continue
    }
    const quote = exampleContainer(line, /^ {0,3}>[ \t]?/u)
    if (quote.quotes !== depth) {
      closeIndented()
      margins.length = 0
      depth = quote.quotes
      boundary = true
    }
    const { text, column } = lineLayout(quote.line)
    if (!text) {
      boundary = true
      if (indented !== undefined) gap += 1
      document.prose += line + '\n'
      continue
    }
    while (margins.length && column < margins[margins.length - 1]) margins.pop()
    const margin = margins.at(-1) ?? 0
    if (column >= margin + 4 && (boundary || indented !== undefined)) {
      indented = (indented ?? '') + '\n'.repeat(gap) + removeIndent(quote.line, margin + 4) + '\n'
      gap = 0
      boundary = false
      continue
    }
    closeIndented()
    const trimmed = line.trimStart()
    if (/^[-*] /u.test(trimmed)) document.bullets += 1
    fence = openFence(line, depth, margin)
    if (fence) {
      if (fence.quotes === depth && fence.margin > margin) margins.push(fence.margin)
      continue
    }
    const marker = listMarker.exec(text)?.[0]
    if (marker) margins.push(column + indentation(marker))
    boundary = /^(?:#{1,6}(?:[ \t]|$)|(?:=+|-{3,})[ \t]*$)/u.test(text)
    const heading = /^(#{1,6}) (.+)$/u.exec(trimmed)
    if (heading) document.headings.push([heading[1].length, heading[2].trim()])
    document.prose += line + '\n'
  }
  closeIndented()
  if (fence) document.blocks.push([`unclosed:${fence.language}`, fence.body])
  return document
}

export function inlineCodes(prose: string): string[] {
  const codes = [...prose.matchAll(/`([^`\n]+)`/gu)].map((match) =>
    match[1].replace(/<([^>\n]+)>/gu, (value, inner: string) =>
      /^\p{Lu}/u.test(inner) ? value : '<placeholder>',
    ),
  )
  return codes.sort()
}

export function links(prose: string): string[] {
  return [...prose.replace(/`[^`\n]+`/gu, '').matchAll(/\[[^\]\n]*\]\(([^)\n]+)\)/gu)].map(
    (match) => match[1].trim().replace(/^<|>$/gu, ''),
  )
}

export function anchors(document: MarkdownDocument): Set<string> {
  const counts = new Map<string, number>()
  return new Set(
    document.headings.map(([, heading]) => {
      const base = heading
        .replace(/[^\p{L}\p{N}_ -]/gu, '')
        .toLowerCase()
        .replaceAll(' ', '-')
      const count = counts.get(base) ?? 0
      counts.set(base, count + 1)
      return count ? `${base}-${count}` : base
    }),
  )
}

export function historyKeys(document: MarkdownDocument): string[][] {
  return document.headings
    .filter(([level]) => level === 2)
    .map(([, heading]) =>
      [
        ...heading.matchAll(/v?\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?|\d{4}-\d{2}-\d{2}|Unreleased/gu),
      ].map(([value]) => value),
    )
}
