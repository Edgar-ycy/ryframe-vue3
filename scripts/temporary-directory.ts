import { mkdtemp } from 'node:fs/promises'
import path from 'node:path'

// mkdtemp 不像 mkdir 自动转换 Windows 长路径；namespace 只进入文件系统边界。
export async function createTemporaryDirectory(prefix: string): Promise<string> {
  const created = await mkdtemp(path.toNamespacedPath(prefix))
  return path.join(path.dirname(prefix), path.basename(created))
}
