import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const defaultSource = 'https://raw.githubusercontent.com/Edgar-ycy/ryframe/main/openapi/openapi.json'
const source = process.env.RYFRAME_OPENAPI_SOURCE || defaultSource
const outputPath = path.resolve('openapi/openapi.json')
const passwordPolicyPath = path.resolve(
  'src/shared/security/passwordPolicy.generated.json',
)

async function readSource(value) {
  if (!/^https?:\/\//i.test(value)) return readFile(path.resolve(value), 'utf8')

  const response = await fetch(value, { redirect: 'follow' })
  if (!response.ok) {
    throw new Error(`failed to fetch OpenAPI contract: ${response.status} ${response.statusText}`)
  }
  return response.text()
}

const rawDocument = await readSource(source)
const document = JSON.parse(rawDocument)

if (!String(document.openapi).startsWith('3.') || document.info?.title !== 'RyFrame API') {
  throw new Error('source is not a supported RyFrame OpenAPI 3 contract')
}

const passwordPolicy = document['x-ryframe-password-policy']
if (!passwordPolicy
  || passwordPolicy.version !== 1
  || !Number.isInteger(passwordPolicy.min_length)
  || !Number.isInteger(passwordPolicy.max_length)
  || typeof passwordPolicy.pattern !== 'string'
  || passwordPolicy.allowed_characters !== 'ascii_graphic'
  || !Array.isArray(passwordPolicy.required_classes)) {
  throw new Error('source is missing a supported RyFrame password policy')
}

await mkdir(path.dirname(outputPath), { recursive: true })
await mkdir(path.dirname(passwordPolicyPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8')
await writeFile(passwordPolicyPath, `${JSON.stringify(passwordPolicy, null, 2)}\n`, 'utf8')
console.log(`Synced RyFrame OpenAPI contract from ${source}`)
