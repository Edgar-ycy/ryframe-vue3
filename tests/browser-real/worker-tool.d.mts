export function bindWorkerTool(backend: string): {
  executable: string
  verifyUnchanged(): void
}
export function parseWorkerJson(source: string): unknown
