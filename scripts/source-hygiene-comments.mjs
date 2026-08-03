function skipQuotedString(text, start, quote) {
  let cursor = start + 1

  while (cursor < text.length) {
    if (text[cursor] === '\\') {
      cursor += 2
      continue
    }
    if (text[cursor] === quote) return cursor + 1
    cursor += 1
  }

  return cursor
}

function lineNumberAt(text, offset) {
  return text.slice(0, offset).split('\n').length
}

export function collectComments(text, extension) {
  const comments = []
  const isYaml = extension === '.yaml' || extension === '.yml'
  const supportsSlashComments = !isYaml
  let cursor = 0

  while (cursor < text.length) {
    const current = text[cursor]
    const next = text[cursor + 1]

    if (current === '\'' || current === '"' || current === '`') {
      cursor = skipQuotedString(text, cursor, current)
      continue
    }

    if (
      supportsSlashComments
      && current === '/'
      && next === '/'
      && text[cursor - 1] !== '\\'
    ) {
      const end = text.indexOf('\n', cursor + 2)
      comments.push({
        body: text.slice(cursor + 2, end === -1 ? text.length : end),
        line: lineNumberAt(text, cursor),
      })
      cursor = end === -1 ? text.length : end + 1
      continue
    }

    if (supportsSlashComments && current === '/' && next === '*') {
      const end = text.indexOf('*/', cursor + 2)
      comments.push({
        body: text.slice(cursor + 2, end === -1 ? text.length : end),
        line: lineNumberAt(text, cursor),
      })
      cursor = end === -1 ? text.length : end + 2
      continue
    }

    if (text.startsWith('<!--', cursor)) {
      const end = text.indexOf('-->', cursor + 4)
      comments.push({
        body: text.slice(cursor + 4, end === -1 ? text.length : end),
        line: lineNumberAt(text, cursor),
      })
      cursor = end === -1 ? text.length : end + 3
      continue
    }

    if (isYaml && current === '#' && (cursor === 0 || /\s/u.test(text[cursor - 1]))) {
      const end = text.indexOf('\n', cursor + 1)
      comments.push({
        body: text.slice(cursor + 1, end === -1 ? text.length : end),
        line: lineNumberAt(text, cursor),
      })
      cursor = end === -1 ? text.length : end + 1
      continue
    }

    cursor += 1
  }

  return comments
}
