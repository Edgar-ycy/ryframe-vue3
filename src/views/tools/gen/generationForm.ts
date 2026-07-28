import type { GenerateRequest } from '@/api/modules/tools'
import { translate } from '@/i18n'

const WINDOWS_DRIVE_PATH = /^[a-z]:[\\/]/i
const WINDOWS_UNC_PATH = /^\\\\[^\\/]+[\\/][^\\/]+/

export function isAbsoluteOutputPath(value: string): boolean {
  const path = value.trim()
  return path.startsWith('/') || WINDOWS_DRIVE_PATH.test(path) || WINDOWS_UNC_PATH.test(path)
}

export function buildGenerateRequest(tableName: string, outputDir: string): GenerateRequest {
  const normalizedOutputDir = outputDir.trim()
  if (!isAbsoluteOutputPath(normalizedOutputDir)) {
    throw new Error(translate('tools.generator.outputPathAbsolute'))
  }

  return {
    output_dir: normalizedOutputDir,
    options: { tables: [tableName] },
  }
}
