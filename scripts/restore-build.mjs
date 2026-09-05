import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { lstatSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs'
import path from 'node:path'

export const receiptPath = '.vite/restore-build.json'
export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')

export function sourceSnapshot(root) {
  const git = (...args) => execFileSync('git', ['-C', root, ...args], { windowsHide: true })
  if (realpathSync(git('rev-parse', '--show-toplevel').toString().trim()) !== realpathSync(root))
    throw new Error('恢复构建必须使用实际 Git 仓库根目录')
  const files = git('ls-files', '--others', '--exclude-standard', '-z')
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .sort()
    .map((relative) => {
      const file = path.resolve(root, relative)
      if (
        !realpathSync(file).startsWith(realpathSync(root) + path.sep) ||
        !lstatSync(file).isFile()
      )
        throw new Error('源码快照包含越界路径或非普通文件')
      return { path: relative, sha256: sha256(readFileSync(file)) }
    })
  return {
    head: git('rev-parse', 'HEAD').toString().trim(),
    patch_sha256: sha256(git('diff', '--binary', 'HEAD')),
    files,
    clean: git('status', '--porcelain', '--untracked-files=all').length === 0,
  }
}

export function productionFiles(dist) {
  const files = []
  function visit(directory) {
    for (const name of readdirSync(directory).sort()) {
      const file = path.join(directory, name)
      const relative = path.relative(dist, file).replaceAll('\\', '/')
      const stat = lstatSync(file)
      if (stat.isSymbolicLink()) throw new Error('生产构建不能通过链接引用外部文件')
      if (stat.isDirectory()) visit(file)
      else if (stat.isFile() && relative !== receiptPath) {
        const bytes = readFileSync(file)
        files.push({ path: relative, bytes: bytes.length, sha256: sha256(bytes) })
      }
    }
  }
  visit(dist)
  if (!files.some((file) => file.path === 'index.html')) throw new Error('缺少生产首页')
  if (!files.some((file) => file.path === '.vite/manifest.json'))
    throw new Error('缺少 Vite 生产 manifest')
  return files
}

export function writeBuildReceipt(root, before) {
  const after = sourceSnapshot(root)
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('构建期间源码发生变化')
  const receipt = { format_version: 1, kind: 'restore-frontend-build', source: after }
  receipt.files = productionFiles(path.join(root, 'dist'))
  writeFileSync(path.join(root, 'dist', receiptPath), JSON.stringify(receipt, null, 2) + '\n', {
    flag: 'wx',
  })
  return receipt
}
