import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const execFileAsync = promisify(execFile)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const policyPath = path.join(root, 'scripts', 'supply-chain-policy.json')
const policyKeys = new Set(['schema_version', 'allowed_licenses', 'exceptions'])
const exceptionKeys = new Set(['package', 'version', 'license', 'reason', 'owner', 'expires'])
const expressionOperators = new Set(['AND', 'OR', 'WITH'])
const ownerPattern = /^(?:@[A-Za-z0-9_.-]+|[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)$/u
const datePattern = /^\d{4}-\d{2}-\d{2}$/u

function exactKeys(value, expected) {
  return Object.keys(value).filter(key => !expected.has(key))
}

function isValidDate(value) {
  if (!datePattern.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value
}

function todayUtc(now) {
  return now.toISOString().slice(0, 10)
}

export function validatePolicy(policy, now = new Date()) {
  const errors = []
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) {
    return ['策略必须是 JSON 对象']
  }
  for (const key of exactKeys(policy, policyKeys)) errors.push(`策略包含未知字段：${key}`)
  if (policy.schema_version !== 1) errors.push('schema_version 必须为 1')
  if (!Array.isArray(policy.allowed_licenses) || policy.allowed_licenses.length === 0) {
    errors.push('allowed_licenses 必须是非空数组')
  }
  else {
    const seen = new Set()
    for (const license of policy.allowed_licenses) {
      if (typeof license !== 'string' || license.trim() !== license || license.length === 0) {
        errors.push('allowed_licenses 只能包含非空且已规范化的字符串')
      }
      else if (seen.has(license)) errors.push(`许可证重复：${license}`)
      else seen.add(license)
    }
  }
  if (!Array.isArray(policy.exceptions)) {
    errors.push('exceptions 必须是数组')
    return errors
  }

  const exceptionIds = new Set()
  const today = todayUtc(now)
  for (const [index, exception] of policy.exceptions.entries()) {
    const label = `exceptions[${index}]`
    if (!exception || typeof exception !== 'object' || Array.isArray(exception)) {
      errors.push(`${label} 必须是对象`)
      continue
    }
    for (const key of exactKeys(exception, exceptionKeys)) errors.push(`${label} 包含未知字段：${key}`)
    for (const key of exceptionKeys) {
      if (typeof exception[key] !== 'string' || exception[key].trim().length === 0) {
        errors.push(`${label}.${key} 必须是非空字符串`)
      }
    }
    if (typeof exception.owner === 'string' && !ownerPattern.test(exception.owner)) {
      errors.push(`${label}.owner 必须使用 @用户 或 组织/团队 格式`)
    }
    if (typeof exception.expires === 'string') {
      if (!isValidDate(exception.expires)) errors.push(`${label}.expires 必须是有效的 YYYY-MM-DD 日期`)
      else if (exception.expires <= today) errors.push(`${label}.expires 必须晚于 ${today}`)
    }
    const id = `${exception.package}\u0000${exception.version}\u0000${exception.license}`
    if (exceptionIds.has(id)) errors.push(`${label} 与其他例外重复`)
    exceptionIds.add(id)
  }
  return errors
}

function versionsOf(entry) {
  if (Array.isArray(entry.versions)) return entry.versions
  if (typeof entry.version === 'string') return [entry.version]
  return []
}

export function normalizeLicenseReport(report) {
  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    throw new TypeError('pnpm 许可证报告必须是对象')
  }
  const records = []
  for (const [license, packages] of Object.entries(report)) {
    if (!Array.isArray(packages)) throw new TypeError(`许可证 ${license} 的软件包列表必须是数组`)
    for (const entry of packages) {
      if (!entry || typeof entry !== 'object' || typeof entry.name !== 'string') {
        throw new TypeError(`许可证 ${license} 包含无效的软件包记录`)
      }
      const versions = versionsOf(entry)
      if (versions.length === 0 || versions.some(version => typeof version !== 'string')) {
        throw new TypeError(`${entry.name} 缺少有效版本`)
      }
      for (const version of versions) records.push({ license, name: entry.name, version })
    }
  }
  return records.sort((left, right) => (
    left.name.localeCompare(right.name)
    || left.version.localeCompare(right.version)
    || left.license.localeCompare(right.license)
  ))
}

function licenseIdentifiers(expression) {
  const normalized = expression.replaceAll('(', ' ').replaceAll(')', ' ').trim()
  if (normalized.length === 0) return []
  return normalized.split(/\s+/u).filter(token => !expressionOperators.has(token))
}

export function evaluateLicenseReport(policy, report, now = new Date()) {
  const errors = validatePolicy(policy, now)
  if (errors.length > 0) return errors

  const allowed = new Set(policy.allowed_licenses)
  const usedExceptions = new Set()
  const exceptions = new Map(policy.exceptions.map((entry, index) => [
    `${entry.package}\u0000${entry.version}\u0000${entry.license}`,
    index,
  ]))

  for (const record of normalizeLicenseReport(report)) {
    const identifiers = licenseIdentifiers(record.license)
    const isAllowed = identifiers.length > 0 && identifiers.every(identifier => allowed.has(identifier))
    if (isAllowed) continue
    const key = `${record.name}\u0000${record.version}\u0000${record.license}`
    const exceptionIndex = exceptions.get(key)
    if (exceptionIndex === undefined) {
      errors.push(`${record.name}@${record.version} 使用未允许的许可证：${record.license}`)
    }
    else usedExceptions.add(exceptionIndex)
  }

  for (const [index, exception] of policy.exceptions.entries()) {
    if (!usedExceptions.has(index)) {
      errors.push(`未使用的许可证例外：${exception.package}@${exception.version} (${exception.license})`)
    }
  }
  return errors
}

function parseArguments(argv) {
  let licensesPath
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === '--') continue
    if (value === '--licenses' && argv[index + 1]) {
      licensesPath = path.resolve(argv[index + 1])
      index += 1
      continue
    }
    throw new Error(`未知参数：${value}`)
  }
  return { licensesPath }
}

async function loadLicenseReport(licensesPath) {
  if (licensesPath) return JSON.parse(await readFile(licensesPath, 'utf8'))
  const pnpmCli = process.env.npm_execpath
  if (!pnpmCli) throw new Error('请通过 pnpm check:supply-chain-policy 运行许可证检查')
  const { stdout } = await execFileAsync(
    process.execPath,
    [pnpmCli, 'licenses', 'list', '--prod', '--json'],
    { cwd: root, maxBuffer: 64 * 1024 * 1024, windowsHide: true },
  )
  return JSON.parse(stdout)
}

async function main() {
  const { licensesPath } = parseArguments(process.argv.slice(2))
  const policy = JSON.parse(await readFile(policyPath, 'utf8'))
  const report = await loadLicenseReport(licensesPath)
  const records = normalizeLicenseReport(report)
  const errors = evaluateLicenseReport(policy, report)
  if (errors.length > 0) {
    console.error('供应链许可证检查失败：')
    for (const error of errors) console.error(`  - ${error}`)
    process.exitCode = 1
    return
  }
  console.log(`供应链许可证检查通过（${records.length} 个直接或传递依赖版本，${policy.exceptions.length} 个有效例外）。`)
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  main().catch((error) => {
    console.error(`供应链许可证检查失败：${error.message}`)
    process.exitCode = 1
  })
}
