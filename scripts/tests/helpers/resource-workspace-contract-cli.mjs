import { parseJson } from '../../resource-render/json.mjs'
import { readRequest } from '../../resource-render/protocol.mjs'
import { prepareOrderFrontendContract } from './resource-workspace-contract.mjs'

function validateRequest(source) {
  const request = parseJson(source)
  const keys = ['format_version', 'permissions', 'operations', 'schema']
  if (
    !request ||
    typeof request !== 'object' ||
    Array.isArray(request) ||
    Object.keys(request).length !== keys.length ||
    !keys.every((key) => Object.hasOwn(request, key))
  ) {
    throw new Error('请求字段不完整或包含未知字段')
  }
  if (request.format_version !== 1) throw new Error('不支持的 Order 前端契约协议版本')
  for (const key of ['permissions', 'operations', 'schema']) {
    if (typeof request[key] !== 'string') throw new Error('契约字段必须是字符串')
    if (!request[key].isWellFormed()) throw new Error('契约字段包含非法 Unicode')
  }
  return request
}

let stage = '读取请求'
try {
  if (process.argv.length !== 2) {
    throw new Error('Order 前端契约工具不接受参数；请求通过标准输入传递')
  }
  const source = await readRequest(process.stdin)
  stage = '校验协议'
  const request = validateRequest(source)
  stage = '装配契约'
  const updated = prepareOrderFrontendContract(request)
  stage = '输出响应'
  const output = JSON.stringify({ format_version: 1, updated }) + '\n'
  await new Promise((resolve, reject) => {
    process.stdout.write(output, (error) => (error ? reject(error) : resolve()))
  })
} catch (error) {
  // 解析及契约诊断只使用固定文案，不输出输入片段或堆栈。
  process.stderr.write(`Order 前端契约${stage}失败：${error.message}；未写入受管文件。\n`)
  process.exitCode = 2
}
