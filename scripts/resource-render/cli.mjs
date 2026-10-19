import { readRequest, renderRequest } from './protocol.mjs'

try {
  if (process.argv.length !== 2) throw new Error('内部资源渲染器不接受参数；请求通过标准输入传递')
  const output = renderRequest(await readRequest(process.stdin))
  await new Promise((resolve, reject) => {
    process.stdout.write(output, (error) => (error ? reject(error) : resolve()))
  })
} catch (error) {
  // JSON 解析器错误可能包含输入片段，不输出堆栈或原始输入。
  process.stderr.write(`前端资源渲染失败：${error.message}；未写入受管文件。\n`)
  process.exitCode = 2
}
