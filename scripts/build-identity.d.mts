import type { ConfigurationFile } from './application-config.mjs'

export const identitySourcePath: '.local-tests/build/source.json'
export interface BuildIdentity {
  frontend_commit: string
  source_file: ConfigurationFile | null
}
export function readBuildIdentity(root: string): BuildIdentity
export function verifyFormalSource(root: string, commit: string): void
export function prepareBuildIdentity(root: string, commit?: string): BuildIdentity
