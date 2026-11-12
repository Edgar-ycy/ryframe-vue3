import type { RealBrowserEnvironment } from './real-browser-environment.mjs'

export function realBrowserArtifactDirectories(
  root: string,
  environment: Pick<RealBrowserEnvironment, 'fixture' | 'serverMode' | 'runId'>,
): { reportDirectory: string; resultsDirectory: string }
