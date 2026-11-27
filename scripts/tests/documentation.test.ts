import assert from 'node:assert/strict'
import test from 'node:test'
import { validateDocuments } from '../check-documentation.ts'

function fixture(): Map<string, string> {
  return new Map([
    ['README.md', '# 说明\n\n[English](README.en.md)\n\n## 启动\n\n`cargo serve`\n'],
    ['README.en.md', '# Guide\n\n[简体中文](README.md)\n\n## Start\n\n`cargo serve`\n'],
  ])
}

function fixtureSource(files: ReadonlyMap<string, string>, name: string): string {
  const source = files.get(name)
  assert.ok(source !== undefined, `缺少文档测试夹具：${name}`)
  return source
}

test('两版相同但均未闭合的代码围栏仍然失败', () => {
  const files = fixture()
  for (const [name, source] of files) files.set(name, source + '```powershell\ncargo serve\n')
  assert.equal(validateDocuments(files).filter((error) => error.includes('围栏未闭合')).length, 2)
})

test('双语文档允许翻译标题和说明，保留相同命令与有效章节链接', () => {
  const files = fixture()
  files.set('README.md', fixtureSource(files, 'README.md') + '[启动](#启动)\n')
  files.set('README.en.md', fixtureSource(files, 'README.en.md') + '[Start](#start)\n')
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
  files.set(
    'README.en.md',
    fixtureSource(files, 'README.en.md').replace('cargo serve', 'cargo reset'),
  )
  assert.match(validateDocuments(files).join(), /技术标识不一致/u)
  files.set('README.en.md', fixtureSource(fixture(), 'README.en.md') + '- Additional promise\n')
  assert.match(validateDocuments(files).join(), /条目不一致/u)
  for (const [name, source] of fixture())
    files.set(name, source + '```powershell\ncargo serve\n```\n')
  assert.deepEqual(validateDocuments(files), [])
  files.set(
    'README.en.md',
    fixtureSource(files, 'README.en.md').replace('cargo serve\n```', 'cargo reset\n```'),
  )
  assert.match(validateDocuments(files).join(), /代码示例不一致/u)
})

test('翻译脚本整行注释和参数占位符不改变实际命令', () => {
  const files = fixture()
  files.set(
    'README.md',
    fixtureSource(files, 'README.md') +
      '`--target <目标键>`\n```powershell\n# 启动\ncargo serve\n```\n',
  )
  files.set(
    'README.en.md',
    fixtureSource(files, 'README.en.md') +
      '`--target <target-key>`\n```powershell\n# Start\ncargo serve\n```\n',
  )
  assert.deepEqual(validateDocuments(files), [])
})

test('引用和列表围栏核对相同命令、允许翻译 shell 注释', () => {
  const pairs = [
    [
      '> 运行示例\n>\n> ```bash\n> # 启动\n> cargo serve\n> > output.txt\n> ```\n',
      '> Example\n>\n> ```bash\n> # Start\n> cargo serve\n> > output.txt\n> ```\n',
    ],
    ['- ```pwsh\n  # 启动\n  cargo serve\n  ```\n', '- ```pwsh\n  # Start\n  cargo serve\n  ```\n'],
    [
      '1. > ~~~bash\n   > # 启动\n   > cargo serve\n   > ~~~\n',
      '1. > ~~~bash\n   > # Start\n   > cargo serve\n   > ~~~\n',
    ],
  ]
  for (const [zh, en] of pairs) {
    const files = fixture()
    files.set('README.md', fixtureSource(files, 'README.md') + '\n' + zh)
    const translated = fixtureSource(files, 'README.en.md') + '\n'
    files.set('README.en.md', translated + en)
    assert.deepEqual(validateDocuments(files), [])
    files.set('README.en.md', translated + en.replace('cargo serve', 'cargo reset'))
    assert.match(validateDocuments(files).join(), /代码示例不一致/u)
  }
})

test('缩进代码和其中形似标题或链接的文字按代码示例比较', () => {
  const pairs = [
    [
      '运行示例\n\n    cargo serve\n    # [literal](not-a-file.md)\n',
      'Example\n\n\tcargo serve\n\t# [literal](not-a-file.md)\n',
    ],
    ['> 运行示例\n>\n>     cargo serve\n', '> Example\n>\n>     cargo serve\n'],
    ['- 运行示例\n\n      cargo serve\n', '- Example\n\n      cargo serve\n'],
  ]
  for (const [zh, en] of pairs) {
    const files = fixture()
    files.set('README.md', fixtureSource(files, 'README.md') + '\n' + zh)
    const translated = fixtureSource(files, 'README.en.md') + '\n'
    files.set('README.en.md', translated + en)
    assert.deepEqual(validateDocuments(files), [])
    files.set('README.en.md', translated + en.replace('cargo serve', 'cargo reset'))
    assert.match(validateDocuments(files).join(), /代码示例不一致/u)
  }
})

test('引用和列表结束时仍检查未闭合围栏', () => {
  for (const example of ['> ```sh\n> cargo serve\n', '- ```sh\n  cargo serve\n']) {
    const files = fixture()
    for (const [name, source] of files) {
      files.set(name, source + '\n' + example + '\n正文\n')
    }
    const errors = validateDocuments(files)
    assert.equal(errors.filter((error) => error.includes('围栏未闭合')).length, 2)
  }
})

test('本地文件与目标章节不存在均报告准确引用', () => {
  const files = fixture()
  files.set(
    'README.en.md',
    fixtureSource(files, 'README.en.md') + '[Missing](missing.md)\n[Start](#missing)\n',
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
