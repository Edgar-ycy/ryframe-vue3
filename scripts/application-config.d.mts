export interface ConfigurationFile {
  path: string
  sha256: string
}

export interface ApplicationConfiguration {
  environment: 'dev' | 'test' | 'prod'
  publicConfig: { apiOrigin: string }
  server: { host: string; port: number; proxyTarget: string }
  files: ConfigurationFile[]
}

export function loadApplicationConfig(
  root: string,
  options?: { environment?: string; directory?: string },
): ApplicationConfiguration
