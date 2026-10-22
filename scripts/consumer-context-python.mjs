import fs from 'node:fs'
import path from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { checkApplicationPath } from './application-config-paths.mjs'
import { fileHash } from './application-config-files.mjs'

function failure() {
  return new Error(
    '消费上下文 python_program 无效或身份/目标摘要漂移；请重新选择可读可执行的绝对入口',
  )
}

function identity(stat) {
  return Object.fromEntries(
    ['dev', 'ino', 'mode', 'nlink', 'uid', 'gid', 'size', 'mtimeNs', 'ctimeNs'].map((key) => [
      key,
      String(stat[key]),
    ]),
  )
}

function inspect(entry) {
  const entryStat = fs.lstatSync(entry, { bigint: true })
  if (!entryStat.isFile() && !entryStat.isSymbolicLink()) throw failure()
  if (!entryStat.isSymbolicLink())
    checkApplicationPath(entry, { label: '消费上下文 Python 普通入口' })
  fs.accessSync(entry, fs.constants.R_OK | fs.constants.X_OK)
  const targetStat = fs.statSync(entry, { bigint: true })
  if (!targetStat.isFile()) throw failure()
  const targetPath = fs.realpathSync.native(entry)
  checkApplicationPath(targetPath, { label: '消费上下文 Python 目标文件' })
  return {
    entry: identity(entryStat),
    link: entryStat.isSymbolicLink() ? fs.readlinkSync(entry) : null,
    targetPath,
    target: identity(targetStat),
  }
}

/** 解释器可显式选择 venv 链接；仅记录实际目标身份，绝不替换调用入口。 */
export function capturePythonProgram(entry) {
  if (
    typeof entry !== 'string' ||
    !path.isAbsolute(entry) ||
    path.normalize(path.parse(entry).root) !== path.parse(path.resolve(entry)).root ||
    [...entry].some(
      (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    ) ||
    entry.split(/[\\/]/u).includes('..')
  )
    throw failure()
  checkApplicationPath(path.dirname(entry), {
    directory: true,
    label: '消费上下文 Python 入口目录',
  })
  try {
    const before = inspect(entry)
    const sha256 = fileHash(fs.readFileSync(entry))
    const after = inspect(entry)
    if (!isDeepStrictEqual(before, after)) throw failure()
    return { ...before, sha256 }
  } catch {
    throw failure()
  }
}
