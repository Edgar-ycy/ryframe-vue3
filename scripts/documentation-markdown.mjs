export function markdown(source, { preserveShellComments = false } = {}) {
  const document = { prose: '', blocks: [], headings: [], bullets: 0 }
  let fence
  for (const line of source.split(/\r?\n/u)) {
    const trimmed = line.trimStart()
    if (fence) {
      if (
        trimmed.startsWith(fence.marker.repeat(fence.length)) &&
        trimmed.replaceAll(fence.marker, '').trim() === ''
      ) {
        document.blocks.push([fence.language, fence.body])
        fence = undefined
      } else if (
        preserveShellComments ||
        !['powershell', 'pwsh', 'sh', 'bash', 'shell'].includes(fence.language) ||
        !trimmed.startsWith('#')
      )
        fence.body += line + '\n'
      continue
    }
    const opening = /^(`{3,}|~{3,})(.*)$/u.exec(trimmed)
    if (opening) {
      fence = {
        marker: opening[1][0],
        length: opening[1].length,
        language: opening[2].trim().toLowerCase(),
        body: '',
      }
      continue
    }
    const heading = /^(#{1,6}) (.+)$/u.exec(trimmed)
    if (heading) document.headings.push([heading[1].length, heading[2].trim()])
    if (/^[-*] /u.test(trimmed)) document.bullets += 1
    document.prose += line + '\n'
  }
  if (fence) document.blocks.push([`unclosed:${fence.language}`, fence.body])
  return document
}

export function inlineCodes(prose) {
  const codes = [...prose.matchAll(/`([^`\n]+)`/gu)].map((match) =>
    match[1].replace(/<([^>\n]+)>/gu, (value, inner) =>
      /^\p{Lu}/u.test(inner) ? value : '<placeholder>',
    ),
  )
  return codes.sort()
}

export function links(prose) {
  return [...prose.replace(/`[^`\n]+`/gu, '').matchAll(/\[[^\]\n]*\]\(([^)\n]+)\)/gu)].map(
    (match) => match[1].trim().replace(/^<|>$/gu, ''),
  )
}

export function anchors(document) {
  const counts = new Map()
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

export function historyKeys(document) {
  return document.headings
    .filter(([level]) => level === 2)
    .map(([, heading]) =>
      [
        ...heading.matchAll(/v?\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?|\d{4}-\d{2}-\d{2}|Unreleased/gu),
      ].map(([value]) => value),
    )
}
