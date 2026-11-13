export interface WorkerTool {
  readonly root: string
  readonly binding: Readonly<{ path: string; bytes: number; sha256: string }>
}
export function validateWorkerTool(value: unknown): Readonly<WorkerTool>

export interface RealBrowserEnvironment {
  scopeId: string
  tenantId: string
  username: string
  python: string
  channel: string | undefined
  gateEndpoint: string | undefined
  credentialEndpoint?: string
  previewResponseAudit: string | undefined
  workerTool: Readonly<WorkerTool>
  backendDir: string
  runtimeDir: string
  requestCapacity: number
  requestWindowSeconds: number
  loginCapacity: number
  loginWindowSeconds: number
  loginBudgetState: string
  port: number
  serverMode: 'dev' | 'preview'
  fixture: 'core' | 'business'
  runId: string | undefined
  baseURL: string | undefined
  restore:
    | Readonly<{
        bindings: string
        coordinatorDir: string
        coordinatorSha: string
        verifierDir: string
        runnerSha: string
        runtimeReceipt: string
        targetPlan: string
        verifierSha: string
      }>
    | undefined
}

export function validateRealBrowserEnvironment(
  environment: unknown,
): Readonly<RealBrowserEnvironment>

export function loadRealBrowserEnvironment(root?: string): Readonly<RealBrowserEnvironment>
export function realBrowserCredentials(
  root?: string,
  execute?: typeof import('node:child_process').execFileSync,
): {
  tenantId: string
  username: string
  password: string
  captchaCode?: string
}
export function readBrokerCredentials(
  endpoint: string,
  execute?: typeof import('node:child_process').execFileSync,
): Readonly<{ password: string }>
export function restorePassword(tenantId: string, root?: string): string
