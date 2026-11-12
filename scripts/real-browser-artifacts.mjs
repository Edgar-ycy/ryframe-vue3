import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { checkApplicationPath } from './application-config-paths.mjs'
import { readBrowserControl } from './browser-control.mjs'

export function realBrowserArtifactDirectories(root, { fixture, serverMode, runId }) {
  const artifactId = runId ?? readBrowserControl(root)?.attempt ?? randomUUID()
  const suffix = `${fixture}/${serverMode}/${artifactId}`
  return {
    reportDirectory: `.local-tests/playwright-real/report/${suffix}`,
    resultsDirectory: `.local-tests/playwright-real/results/${suffix}`,
  }
}

export function requireUnusedRealBrowserArtifacts(root, environment) {
  const { reportDirectory, resultsDirectory } = realBrowserArtifactDirectories(root, environment)
  for (const directory of [reportDirectory, resultsDirectory]) {
    const output = path.resolve(root, directory)
    let existing = output
    for (;;) {
      try {
        fs.lstatSync(existing)
        break
      } catch (error) {
        if (error.code !== 'ENOENT') throw error
        const parent = path.dirname(existing)
        if (parent === existing) throw error
        existing = parent
      }
    }
    if (existing === output)
      throw new Error(`真实浏览器产物目录已存在：${directory}；请使用新的验收代次`)
    checkApplicationPath(existing, { directory: true, label: '真实浏览器产物目录' })
  }
}
