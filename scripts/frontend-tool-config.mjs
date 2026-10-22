import path from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { loadApplicationConfig } from './application-config.mjs'
import { applicationDirectory } from './application-config-paths.mjs'
import {
  configurationSourcePath,
  readManagedJson,
  unchangedManagedJson,
} from './application-config-files.mjs'

const inputs = ['config/tools.json', '.local-tests/frontend-tools.json']

export function loadFrontendToolConfig(root) {
  const before = inputs.map((file) => readManagedJson(root, file, `前端工具配置 ${file}`))
  let directory
  for (const [index, input] of before.entries()) {
    if (!input) continue
    const value = input.value
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      Object.keys(value).some((key) => key !== 'application_config_dir')
    ) {
      throw new Error(`前端工具配置 ${inputs[index]} 字段无效；仅允许 application_config_dir`)
    }
    if (Object.hasOwn(value, 'application_config_dir')) {
      if (
        typeof value.application_config_dir !== 'string' ||
        !value.application_config_dir ||
        /[\0\r\n]/u.test(value.application_config_dir)
      ) {
        throw new Error(
          `前端工具配置 ${inputs[index]} 的 application_config_dir 必须为非空有效路径`,
        )
      }
      directory = value.application_config_dir
    }
  }
  const selected = applicationDirectory(root, directory, 'dev/test/prod')
  inputs.forEach((file, index) =>
    unchangedManagedJson(root, file, before[index], `前端工具配置 ${file}`),
  )
  return { directory: selected, files: before.filter(Boolean).map((input) => input.source) }
}

export function loadFrontendConfiguration(root, environment = process.env.APP_ENV ?? 'dev') {
  const tools = loadFrontendToolConfig(root)
  const application = loadApplicationConfig(root, { environment, directory: tools.directory })
  const after = loadFrontendToolConfig(root)
  const checked = loadApplicationConfig(root, { environment, directory: after.directory })
  if (!isDeepStrictEqual(tools, after) || !isDeepStrictEqual(application, checked)) {
    throw new Error('前端工具或公开配置在读取期间漂移；请稳定文件后重试')
  }
  return {
    ...application,
    configuration: {
      environment: application.environment,
      directory: configurationSourcePath(root, path.resolve(tools.directory)),
      files: application.files,
      tools: tools.files,
    },
  }
}

export function requireSameOrigin(configuration) {
  if (configuration.publicConfig.apiOrigin !== '') {
    const directory = configuration.configuration.directory
    const selected = `${directory}/app.${configuration.environment}.toml`
    throw new Error(
      `真实构建要求 ${selected} 合并后 api_origin 为空；` +
        '请修改所选公开文件以使用浏览器同源，工具不会覆盖配置',
    )
  }
}
