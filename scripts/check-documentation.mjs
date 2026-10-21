import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { anchors, historyKeys, inlineCodes, links, markdown } from './documentation-markdown.mjs'

const same = (left, right) => JSON.stringify(left) === JSON.stringify(right)

// 检查技术内容与结构一致性；翻译语义由提交审查核对。
export function validateDocuments(files, exists = (name) => files.has(name)) {
  const errors = []
  for (const [name, source] of files) {
    const english = name.endsWith('.en.md')
    const counterpart = english
      ? name.replace(/\.en\.md$/u, '.md')
      : name.replace(/\.md$/u, '.en.md')
    if (!files.has(counterpart)) {
      errors.push(`文档缺少另一语言：${name} -> ${counterpart}`)
      continue
    }
    const document = markdown(source)
    if (document.blocks.some(([language]) => language.startsWith('unclosed:'))) {
      errors.push(`文档代码围栏未闭合：${name}`)
    }
    const targets = links(document.prose)
    if (!targets.includes(path.posix.basename(counterpart))) {
      errors.push(`文档缺少语言切换链接：${name}`)
    }
    for (const target of targets) {
      if (target.includes('://') || target.startsWith('mailto:')) continue
      const [file, fragment] = target.split('#', 2)
      let decoded
      try {
        decoded = decodeURIComponent(file)
      } catch {
        errors.push(`文档链接编码无效：${name} -> ${target}`)
        continue
      }
      const local = decoded
        ? path.posix.normalize(path.posix.join(path.posix.dirname(name), decoded))
        : name
      if (!exists(local)) errors.push(`文档本地引用不存在：${name} -> ${target}`)
      else if (fragment && files.has(local)) {
        let anchor
        try {
          anchor = decodeURIComponent(fragment)
        } catch {
          errors.push(`文档章节编码无效：${name} -> ${target}`)
          continue
        }
        if (!anchors(markdown(files.get(local))).has(anchor)) {
          errors.push(`文档章节引用不存在：${name} -> ${target}`)
        }
      }
    }
    if (english) continue
    const translated = markdown(files.get(counterpart))
    if (
      !same(
        document.headings.map(([level]) => level),
        translated.headings.map(([level]) => level),
      ) ||
      document.bullets !== translated.bullets
    )
      errors.push(`中英文文档章节或条目不一致：${name}`)
    if (!same(document.blocks, translated.blocks)) errors.push(`中英文文档代码示例不一致：${name}`)
    if (!same(inlineCodes(document.prose), inlineCodes(translated.prose))) {
      errors.push(`中英文文档命令、参数或技术标识不一致：${name}`)
    }
    if (
      path.posix.basename(name) === 'CHANGELOG.md' &&
      !same(historyKeys(document), historyKeys(translated))
    ) {
      errors.push(`中英文 Changelog 版本、日期或历史顺序不一致：${name}`)
    }
  }
  return errors
}

export function checkDocumentation(root) {
  const listed = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { cwd: root, windowsHide: true, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  )
  const paths = [
    ...new Set(
      listed
        .split('\0')
        .filter(
          (name) =>
            name.endsWith('.md') &&
            !name.startsWith('vendor/') &&
            !name.startsWith('.local-tests/') &&
            existsSync(path.join(root, name)),
        ),
    ),
  ]
  const files = new Map(paths.map((name) => [name, readFileSync(path.join(root, name), 'utf8')]))
  const errors = validateDocuments(files, (name) => existsSync(path.resolve(root, name)))
  if (errors.length) throw new Error(errors.join('\n'))
  console.log(`中英文文档检查通过（${files.size} 个文件）`)
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    checkDocumentation(fileURLToPath(new URL('../', import.meta.url)))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
