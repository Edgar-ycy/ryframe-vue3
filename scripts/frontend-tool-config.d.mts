import type { ApplicationConfiguration, ConfigurationFile } from './application-config.mjs'

export function loadFrontendToolConfig(root: string): {
  directory: string
  files: ConfigurationFile[]
}

export interface FrontendConfiguration extends ApplicationConfiguration {
  configuration: {
    environment: 'dev' | 'test' | 'prod'
    directory: string
    files: ConfigurationFile[]
    tools: ConfigurationFile[]
  }
}

export function loadFrontendConfiguration(root: string, environment?: string): FrontendConfiguration
export function requireSameOrigin(configuration: FrontendConfiguration): void
