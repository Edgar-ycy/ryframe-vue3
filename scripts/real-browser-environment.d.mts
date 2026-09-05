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
  baseURL: string | undefined
}

export function validateRealBrowserEnvironment(
  environment?: NodeJS.ProcessEnv,
): Readonly<RealBrowserEnvironment>
