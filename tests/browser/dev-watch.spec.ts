import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { installApiFixture } from './support/apiFixture'
import { observeDiagnostics } from './support/diagnostics'

test('开发热更新保留源码监听并排除本地验收产物', async ({ context }) => {
  test.skip(process.env.RYFRAME_E2E_SERVER === 'preview', '生产预览不运行文件监听器')
  const page = await context.newPage()
  await installApiFixture(page, observeDiagnostics(page))
  const changes: string[] = []
  page.on('websocket', (socket) => {
    socket.on('framereceived', ({ payload }) => {
      const value: unknown = JSON.parse(payload.toString())
      if (
        value &&
        typeof value === 'object' &&
        'event' in value &&
        value.event === 'file-changed'
      ) {
        changes.push(payload.toString())
      }
    })
  })
  const id = randomUUID()
  const source = resolve(`.watch-probe-${id}.txt`)
  const directory = resolve('.local-tests/watch-probes')
  const artifact = resolve(directory, `artifact-${id}.txt`)
  await mkdir(directory, { recursive: true })
  try {
    await writeFile(artifact, 'trace 0')
    await writeFile(source, 'source 0')
    await page.goto('/login')
    await expect(page.getByRole('button', { name: '登录', exact: true })).toBeEnabled()
    await writeFile(artifact, 'trace 1')
    await writeFile(source, 'source 1')
    await expect
      .poll(() => changes.filter((value) => value.includes(source.replaceAll('\\', '/'))).length)
      .toBeGreaterThan(0)
    const count = changes.length
    await writeFile(artifact, 'trace 2')
    await writeFile(source, 'source 2')
    await expect.poll(() => changes.length).toBeGreaterThan(count)
    expect(changes.filter((value) => value.includes(`artifact-${id}`))).toEqual([])
  } finally {
    await unlink(source).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error
    })
    await unlink(artifact).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error
    })
    await page.close()
  }
})
