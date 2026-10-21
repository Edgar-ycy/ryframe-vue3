import assert from 'node:assert/strict'
import test from 'node:test'
import { validateDocuments } from '../check-documentation.mjs'

function fixture() {
  return new Map([
    ['README.md', '# 说明\n\n[English](README.en.md)\n\n## 启动\n\n`cargo serve`\n'],
    ['README.en.md', '# Guide\n\n[简体中文](README.md)\n\n## Start\n\n`cargo serve`\n'],
  ])
}

test('两版相同但均未闭合的代码围栏仍然失败', () => {
  const files = fixture()
  for (const [name, source] of files) files.set(name, source + '```powershell\ncargo serve\n')
  assert.equal(validateDocuments(files).filter((error) => error.includes('围栏未闭合')).length, 2)
})

test('双语文档允许翻译标题和说明，保留相同命令与有效章节链接', () => {
  const files = fixture()
  files.set('README.md', files.get('README.md') + '[启动](#启动)\n')
  files.set('README.en.md', files.get('README.en.md') + '[Start](#start)\n')
  assert.deepEqual(validateDocuments(files), [])
})

test('缺失任一语言或语言切换链接都不能通过', () => {
  const files = fixture()
  files.delete('README.en.md')
  assert.match(validateDocuments(files).join(), /缺少另一语言/u)
  const complete = fixture()
  complete.set('README.en.md', '# Guide\n\n## Start\n\n`cargo serve`\n')
  assert.match(validateDocuments(complete).join(), /切换链接/u)
})

test('命令参数、完整条目或围栏代码变化均报告不同步', () => {
  const files = fixture()
  files.set('README.en.md', files.get('README.en.md').replace('cargo serve', 'cargo reset'))
  assert.match(validateDocuments(files).join(), /技术标识不一致/u)
  files.set('README.en.md', fixture().get('README.en.md') + '- Additional promise\n')
  assert.match(validateDocuments(files).join(), /条目不一致/u)
  for (const [name, source] of fixture())
    files.set(name, source + '```powershell\ncargo serve\n```\n')
  assert.deepEqual(validateDocuments(files), [])
  files.set(
    'README.en.md',
    files.get('README.en.md').replace('cargo serve\n```', 'cargo reset\n```'),
  )
  assert.match(validateDocuments(files).join(), /代码示例不一致/u)
})

test('翻译脚本整行注释和参数占位符不改变实际命令', () => {
  const files = fixture()
  files.set(
    'README.md',
    files.get('README.md') + '`--target <目标键>`\n```powershell\n# 启动\ncargo serve\n```\n',
  )
  files.set(
    'README.en.md',
    files.get('README.en.md') +
      '`--target <target-key>`\n```powershell\n# Start\ncargo serve\n```\n',
  )
  assert.deepEqual(validateDocuments(files), [])
})

test('本地文件与目标章节不存在均报告准确引用', () => {
  const files = fixture()
  files.set(
    'README.en.md',
    files.get('README.en.md') + '[Missing](missing.md)\n[Start](#missing)\n',
  )
  assert.match(validateDocuments(files).join(), /README.en.md -> missing.md/u)
  assert.match(validateDocuments(files).join(), /README.en.md -> #missing/u)
})

test('Changelog 译文保留版本、日期及完整历史顺序', () => {
  const files = new Map([
    ['CHANGELOG.md', '# 历史\n\n[English](CHANGELOG.en.md)\n\n## [v0.13.1] - 2026-10-08\n'],
    ['CHANGELOG.en.md', '# History\n\n[简体中文](CHANGELOG.md)\n\n## [v0.13.1] - 2026-10-09\n'],
  ])
  assert.match(validateDocuments(files).join(), /版本、日期/u)
})
