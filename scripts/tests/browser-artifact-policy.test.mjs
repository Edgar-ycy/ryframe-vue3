import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

async function read(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8')
}

test('普通与真实浏览器测试保留完整失败产物', async () => {
  for (const config of ['playwright.config.ts', 'playwright.real.config.ts']) {
    const source = await read(config)
    assert.match(source, /screenshot: 'only-on-failure'/u)
    assert.match(source, /trace: 'retain-on-failure'/u)
    assert.match(source, /video: 'retain-on-failure'/u)
    assert.match(source, /mkdirSync\(directory, \{ recursive: true \}\)/u)
  }
})

test('普通浏览器门禁严格上传报告与测试结果', async () => {
  const workflow = await read('.github/workflows/ci.yml')
  const browser = workflow.split('\n  browser:\n', 2)[1].split('\n  node-22-compatibility:\n', 1)[0]

  assert.match(browser, /if: \$\{\{ always\(\) \}\}/u)
  assert.match(browser, /\.local-tests\/playwright\/report/u)
  assert.match(browser, /\.local-tests\/playwright\/results/u)
  assert.match(browser, /if-no-files-found: error/u)
  assert.doesNotMatch(browser, /if-no-files-found: (?:ignore|warn)/u)
})
