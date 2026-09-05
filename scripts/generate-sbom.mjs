import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { TaskUsageError } from './task-runner-contract.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export function parseSbomArguments(argv) {
  let output
  let write = false
  const seen = new Set()
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === '--' && index === 0) continue
    if (seen.has(value)) throw new TaskUsageError('参数重复：' + value)
    seen.add(value)
    if (value === '--output' && argv[index + 1] && !argv[index + 1].startsWith('--')) {
      output = path.resolve(argv[++index])
    } else if (value === '--write') {
      write = true
    } else throw new TaskUsageError('未知或不完整参数：' + value)
  }
  if (write && !output) throw new TaskUsageError('写入 SBOM 必须提供 --output')
  return { output, write }
}

export function validateSbom(sbom) {
  const errors = []
  if (!sbom || typeof sbom !== 'object' || Array.isArray(sbom)) return ['SBOM 必须是 JSON 对象']
  if (sbom.bomFormat !== 'CycloneDX') errors.push('bomFormat 必须为 CycloneDX')
  if (sbom.specVersion !== '1.6') errors.push('specVersion 必须为 1.6')
  if (!Array.isArray(sbom.components)) errors.push('components 必须是数组')
  if (sbom.metadata?.component?.name !== 'ryframe-vue3') {
    errors.push('metadata.component.name 必须为 ryframe-vue3')
  }
  return errors
}

function collectSbom() {
  const pnpmCli = process.env.npm_execpath
  if (!pnpmCli) {
    throw new Error('请通过 corepack pnpm generate --sbom --output <文件> --write 生成 SBOM 文件')
  }
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [pnpmCli, 'sbom', '--sbom-format', 'cyclonedx', '--sbom-spec-version', '1.6', '--prod'],
      { cwd: root, stdio: ['ignore', 'pipe', 'inherit'], shell: false, windowsHide: true },
    )
    let output = ''
    child.stdout.on('data', (chunk) => (output += chunk))
    child.once('error', reject)
    child.once('close', (code) => {
      if (code !== 0) return reject(new Error('pnpm sbom 退出码为 ' + code))
      try {
        resolve(JSON.parse(output))
      } catch (error) {
        reject(error)
      }
    })
  })
}

async function writeSbom(output, sbom) {
  await mkdir(path.dirname(output), { recursive: true })
  const temporary = output + '.tmp-' + randomUUID()
  try {
    await writeFile(temporary, JSON.stringify(sbom, null, 2) + '\n', { flag: 'wx' })
    await rename(temporary, output)
  } finally {
    await rm(temporary, { force: true })
  }
}

/** 缺少 --write 时只在内存中生成和校验，连输出目录也不创建。 */
export async function generateSbom(options, { collect = collectSbom } = {}) {
  if (options.write && !options.output) throw new TaskUsageError('写入 SBOM 必须提供 --output')
  const sbom = await collect()
  const errors = validateSbom(sbom)
  if (errors.length > 0) throw new Error(errors.join('；'))
  if (options.write) await writeSbom(options.output, sbom)
  return { components: sbom.components.length, output: options.output, written: options.write }
}

async function main() {
  const result = await generateSbom(parseSbomArguments(process.argv.slice(2)))
  console.log(
    result.written
      ? 'CycloneDX SBOM 已生成：' + result.output + '（' + result.components + ' 个组件）。'
      : 'CycloneDX SBOM 预览通过（' + result.components + ' 个组件，未写入文件）。',
  )
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  main().catch((error) => {
    console.error('CycloneDX SBOM 生成失败：' + error.message)
    process.exitCode = error instanceof TaskUsageError ? 2 : 1
  })
}
