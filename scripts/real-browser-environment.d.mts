export interface RealBrowserEnvironment {
  scopeId: string
  tenantId: string
  username: string
  python: string
  channel: string | undefined
  gateEndpoint: string | undefined
  previewResponseAudit: string | undefined
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
        runnerSha: string
        runtimeReceipt: string
        targetPlan: string
        verifierSha: string
        python: string
      }>
    | undefined
}

export function validateRealBrowserEnvironment(
  environment: unknown,
): Readonly<RealBrowserEnvironment>

export function loadRealBrowserEnvironment(root?: string): Readonly<RealBrowserEnvironment>
export function realBrowserCredentials(root?: string): {
  tenantId: string
  username: string
  password: string
  captchaCode?: string
}
export function restorePassword(tenantId: string, root?: string): string
