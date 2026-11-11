import type { ExecFileSyncOptionsWithStringEncoding } from 'node:child_process'
import type { WorkerTool } from './real-browser-environment.mjs'

export interface BoundWorkerTool {
  executable: string
  verifyUnchanged: () => void
}
export function bindWorkerTool(workerTool: WorkerTool): BoundWorkerTool
export function invokeWorkerTool(
  tool: BoundWorkerTool,
  args: string[],
  options: ExecFileSyncOptionsWithStringEncoding,
  execute?: (
    program: string,
    args: string[],
    options: ExecFileSyncOptionsWithStringEncoding,
  ) => string,
): string
export function parseWorkerJson(source: string): unknown
