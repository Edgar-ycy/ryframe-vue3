import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { checkApplicationPath } from './application-config-paths.mjs'
import { readManagedJson, unchangedManagedJson } from './application-config-files.mjs'

export const identitySourcePath = '.local-tests/build/source.json'
const label = `构建身份 ${identitySourcePath}`
const commitPattern = /^[a-f0-9]{40}$/u

/** 分阶段分类 IO 与来源变化，只输出 code 和明确的受管路径修复办法。 */
function identityFailure(stage, error, repair) {
  const reason = error.code
    ? `IO ${error.code}`
    : stage === '原子写入'
      ? '来源或写入状态变化'
      : 'IO UNKNOWN'
  return new Error(`${label}${stage}失败：${reason}；${repair}`)
}

export function readBuildIdentity(root) {
  const before = readManagedJson(root, identitySourcePath, label)
  if (!before) {
    unchangedManagedJson(root, identitySourcePath, before, label)
    return { frontend_commit: 'development', source_file: null }
  }
  const value = before.value
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(',') !== 'format_version,frontend_commit' ||
    value.format_version !== 1 ||
    typeof value.frontend_commit !== 'string' ||
    (value.frontend_commit !== 'development' && !commitPattern.test(value.frontend_commit))
  ) {
    throw new Error(
      `${label} 字段无效；请将文件修正为仅含 format_version 和 frontend_commit 的 JSON 对象，` +
        '将 format_version 设为数字 1；frontend_commit 必须是字符串 "development" 或' +
        '目标干净 HEAD 的完整 40 位小写 Git SHA 字符串；修正文件后重试构建',
    )
  }
  unchangedManagedJson(root, identitySourcePath, before, label)
  return { frontend_commit: value.frontend_commit, source_file: before.source }
}

export function verifyFormalSource(root, commit) {
  if (typeof commit !== 'string' || !commitPattern.test(commit)) {
    throw new Error('--source-commit 必须为完整 40 位小写 Git SHA')
  }
  const git = (...args) =>
    execFileSync('git', ['-C', root, ...args], {
      encoding: 'utf8',
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
  let valid
  try {
    const actual = fs.realpathSync.native(root)
    valid =
      fs.realpathSync.native(git('rev-parse', '--show-toplevel')) === actual &&
      git('rev-parse', 'HEAD') === commit &&
      git('status', '--porcelain', '--untracked-files=all') === ''
  } catch {
    throw new Error('正式构建来源核对失败；请检查目标 Git 仓库，未写构建身份')
  }
  if (!valid) throw new Error('正式或外部构建必须使用声明的精确干净前端源码；未写构建身份')
}

/** 只写固定忽略目录，以同目录临时文件原子替换身份；失败保留现场路径。 */
export function prepareBuildIdentity(root, commit) {
  checkApplicationPath(root, { directory: true, label })
  if (commit !== undefined) verifyFormalSource(root, commit)
  const before = readBuildIdentity(root)
  let directory = root
  for (const part of ['.local-tests', 'build']) {
    directory += path.sep + part
    try {
      fs.mkdirSync(directory)
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw identityFailure('目录准备', error, `请检查受管目录 ${directory} 的访问权限`)
      }
    }
    checkApplicationPath(directory, { directory: true, label })
  }
  const temporary = path.join(directory, `source.${randomUUID()}.tmp`)
  const target = path.join(directory, 'source.json')
  try {
    const handle = fs.openSync(temporary, 'wx')
    try {
      const value = { format_version: 1, frontend_commit: commit ?? 'development' }
      fs.writeFileSync(handle, JSON.stringify(value, null, 2) + '\n')
      fs.fsyncSync(handle)
    } finally {
      fs.closeSync(handle)
    }
    if (JSON.stringify(readBuildIdentity(root)) !== JSON.stringify(before)) {
      throw new Error('身份来源在写入期间漂移')
    }
    if (commit !== undefined) verifyFormalSource(root, commit)
    fs.renameSync(temporary, target)
  } catch (error) {
    throw identityFailure(
      '原子写入',
      error,
      `请核对现场 ${temporary} 与 ${target} 后重试，未签发构建收据`,
    )
  }
  return readBuildIdentity(root)
}
