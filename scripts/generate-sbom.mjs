import { spawn } from 'node:child_process'
import { mkdir, open, readFile, rename, rm } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function parseArguments(argv) {
  let output = path.join(root, 'artifacts', 'ryframe-vue3.cdx.json')
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === '--') continue
    if (value === '--output' && argv[index + 1]) {
      output = path.resolve(argv[index + 1])
      index += 1
      continue
    }
    throw new Error(`未知参数：${value}`)
  }
  return { output }
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

async function runPnpmSbom(output) {
  const pnpmCli = process.env.npm_execpath
  if (!pnpmCli) throw new Error('请通过 pnpm sbom:generate 生成 SBOM')
  await mkdir(path.dirname(output), { recursive: true })
  const temporary = `${output}.tmp-${process.pid}`
  const handle = await open(temporary, 'w')
  let spawnError
  try {
    const exitCode = await new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [pnpmCli, 'sbom', '--sbom-format', 'cyclonedx', '--sbom-spec-version', '1.6', '--prod'],
        { cwd: root, stdio: ['ignore', handle.fd, 'inherit'], windowsHide: true },
      )
      child.once('error', reject)
      child.once('close', resolve)
    })
    if (exitCode !== 0) throw new Error(`pnpm sbom 退出码为 ${exitCode}`)
  }
  catch (error) {
    spawnError = error
  }
  finally {
    await handle.close()
  }
  if (spawnError) {
    await rm(temporary, { force: true })
    throw spawnError
  }

  try {
    const sbom = JSON.parse(await readFile(temporary, 'utf8'))
    const errors = validateSbom(sbom)
    if (errors.length > 0) throw new Error(errors.join('；'))
    await rm(output, { force: true })
    await rename(temporary, output)
    return sbom.components.length
  }
  catch (error) {
    await rm(temporary, { force: true })
    throw error
  }
}

async function main() {
  const { output } = parseArguments(process.argv.slice(2))
  const componentCount = await runPnpmSbom(output)
  console.log(`CycloneDX SBOM 已生成：${output}（${componentCount} 个组件）。`)
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  main().catch((error) => {
    console.error(`CycloneDX SBOM 生成失败：${error.message}`)
    process.exitCode = 1
  })
}
