export interface RestoreBrowserEnvironment {
  bindings: string
  coordinatorDir: string
  runnerSha: string
  runtimeReceipt: string
  targetPlan: string
  verifierSha: string
}

export interface RestoreEvidenceDescriptor {
  path: string
  sha256: string
}

export interface RestoreLineageDescriptor extends RestoreEvidenceDescriptor {
  bytes: number
}

export const restoreSpecs: string[]
export function realTestSelection(
  restore: RestoreBrowserEnvironment | undefined,
  fixture: string,
  baseURL?: string,
  root?: string,
  checkout?: (directory: string, sha: string, label?: string) => string,
): {
  selection: { testIgnore: string[] } | { testMatch: string[] }
  reporter:
    | {
        binding: RestoreEvidenceDescriptor
        datasetLineage: RestoreLineageDescriptor
        runnerRoot: string
        runnerSha: string
        runtime: RestoreEvidenceDescriptor
        sourceGeneration: RestoreLineageDescriptor
        target: RestoreEvidenceDescriptor
        verifierRoot: string
        verifierSha: string
      }
    | undefined
}
