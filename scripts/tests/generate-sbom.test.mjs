import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { generateSbom, parseSbomArguments } from '../generate-sbom.mjs'

const sbom = {
  bomFormat: 'CycloneDX',
  specVersion: '1.6',
  components: [],
  metadata: { component: { name: 'ryframe-vue3' } },
}

async function fixture(t) {
  const base = path.resolve('.local-tests/node-unit')
  await mkdir(base, { recursive: true })
  const directory = await mkdtemp(path.join(base, 'sbom-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  return directory
}

test('SBOM 预览不创建目录或修改指定文件', async (t) => {
  const directory = await fixture(t)
  const output = path.join(directory, 'missing', 'sbom.json')
  const result = await generateSbom({ output, write: false }, { collect: async () => sbom })
  assert.equal(result.written, false)
  await assert.rejects(stat(path.dirname(output)), { code: 'ENOENT' })
  const existing = path.join(directory, 'existing.json')
  await writeFile(existing, 'existing')
  await generateSbom({ output: existing, write: false }, { collect: async () => sbom })
  assert.equal(await readFile(existing, 'utf8'), 'existing')
})

test('显式写入先校验再替换，失败保留原文件且不遗留临时输出', async (t) => {
  const directory = await fixture(t)
  const output = path.join(directory, 'sbom.json')
  await writeFile(output, 'existing')
  await assert.rejects(
    generateSbom({ output, write: true }, { collect: async () => ({}) }),
    /bomFormat/u,
  )
  assert.equal(await readFile(output, 'utf8'), 'existing')
  await generateSbom({ output, write: true }, { collect: async () => sbom })
  assert.deepEqual(JSON.parse(await readFile(output, 'utf8')), sbom)
  assert.deepEqual(await readdir(directory), ['sbom.json'])
})

test('SBOM 写入必须显式给出输出，重复和缺失参数拒绝', () => {
  assert.deepEqual(parseSbomArguments([]), { output: undefined, write: false })
  for (const args of [['--write'], ['--output'], ['--write', '--write'], ['--unknown']]) {
    assert.throws(() => parseSbomArguments(args))
  }
})
