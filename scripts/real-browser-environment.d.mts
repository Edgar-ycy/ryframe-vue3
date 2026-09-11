export interface RealBrowserEnvironment {
  scopeId: string
  tenantId: string
  username: string
  backendDir: string
  runtimeDir: string
  requestCapacity: number
  requestWindowSeconds: number
  loginCapacity: number
  loginWindowSeconds: number
  loginBudgetState: string
  port: number
  serverMode: 'dev' | 'preview'
  fixture: 'core' | 'device'
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
  environment?: NodeJS.ProcessEnv,
): Readonly<RealBrowserEnvironment>
