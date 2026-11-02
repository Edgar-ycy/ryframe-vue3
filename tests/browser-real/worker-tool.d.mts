import type { WorkerTool } from '../../scripts/real-browser-environment.mjs'

export function bindWorkerTool(workerTool: WorkerTool): {
  executable: string
  verifyUnchanged: () => void
}
export function parseWorkerJson(source: string): unknown
