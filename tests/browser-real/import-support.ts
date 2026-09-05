import { expect, type Page, type TestInfo } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { act } from './support'

const XLSX_MEDIA_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const MIN_LARGE_IMPORT_BYTES = 2 * 1024 * 1024
const MAX_IMPORT_BYTES = 10 * 1024 * 1024

export interface UserImportFixtureReceipt {
  path: string
  bytes: number
  sha256: string
  template_sha256: string
  username: string
  rows: 3
  large: boolean
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function exactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).sort().join(',') === [...keys].sort().join(',')
}

function sha256(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex')
}

export function parseUserImportFixtureReceipt(
  stdout: string,
  expected: { path: string; templateSha256: string; username: string; large: boolean },
): UserImportFixtureReceipt {
  let envelope: unknown
  try {
    envelope = JSON.parse(stdout)
  } catch {
    throw new Error('用户导入 fixture 没有返回有效 JSON 收据')
  }
  if (!record(envelope) || !exactKeys(envelope, ['ok', 'fixture']) || envelope.ok !== true) {
    throw new Error('用户导入 fixture 生成失败')
  }
  const fixture = envelope.fixture
  if (
    !record(fixture) ||
    !exactKeys(fixture, [
      'path',
      'bytes',
      'sha256',
      'template_sha256',
      'username',
      'rows',
      'large',
    ]) ||
    typeof fixture.path !== 'string' ||
    path.resolve(fixture.path) !== path.resolve(expected.path) ||
    typeof fixture.bytes !== 'number' ||
    !Number.isSafeInteger(fixture.bytes) ||
    fixture.bytes <= 0 ||
    (expected.large && fixture.bytes <= MIN_LARGE_IMPORT_BYTES) ||
    fixture.bytes > MAX_IMPORT_BYTES ||
    typeof fixture.sha256 !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(fixture.sha256) ||
    fixture.template_sha256 !== expected.templateSha256 ||
    !/^[a-f0-9]{64}$/u.test(expected.templateSha256) ||
    fixture.username !== expected.username ||
    fixture.rows !== 3 ||
    fixture.large !== expected.large
  ) {
    throw new Error('用户导入 fixture 收据与本次请求不一致')
  }
  return {
    path: fixture.path,
    bytes: fixture.bytes,
    sha256: fixture.sha256,
    template_sha256: expected.templateSha256,
    username: expected.username,
    rows: 3,
    large: expected.large,
  }
}

export function verifyUserImportFixtureContent(
  receipt: UserImportFixtureReceipt,
  content: Buffer,
): void {
  if (content.byteLength !== receipt.bytes || sha256(content) !== receipt.sha256) {
    throw new Error('用户导入 fixture 在上传前发生变化')
  }
}

export async function attachVerifiedUserImportFixture(
  info: Pick<TestInfo, 'attach'>,
  receipt: UserImportFixtureReceipt,
  content: Buffer,
): Promise<void> {
  verifyUserImportFixtureContent(receipt, content)
  await info.attach(`${receipt.username}-fixture-receipt.json`, {
    body: `${JSON.stringify(receipt, null, 2)}\n`,
    contentType: 'application/json',
  })
}

async function prepareFixture(
  info: TestInfo,
  username: string,
  large: boolean,
): Promise<{ content: Buffer; receipt: UserImportFixtureReceipt }> {
  const template = info.outputPath('template.xlsx')
  const output = info.outputPath(`${username}.xlsx`)
  const templateContent = await readFile(template)
  const templateSha256 = sha256(templateContent)
  const backend = path.resolve(process.env.RYFRAME_E2E_BACKEND_DIR || '../ryframe')
  const stdout = execFileSync(
    process.env.RYFRAME_E2E_PYTHON || 'python',
    [
      '-X',
      'utf8',
      path.join(backend, 'scripts/user_import_fixture.py'),
      'browser',
      '--template',
      template,
      '--template-sha256',
      templateSha256,
      '--output',
      output,
      '--username',
      username,
      ...(large ? ['--large'] : []),
    ],
    { encoding: 'utf8', maxBuffer: 1024 * 1024, timeout: 10_000, windowsHide: true },
  )
  const receipt = parseUserImportFixtureReceipt(stdout, {
    path: output,
    templateSha256,
    username,
    large,
  })
  const content = await readFile(output)
  await attachVerifiedUserImportFixture(info, receipt, content)
  return { content, receipt }
}

export async function createImport(page: Page, info: TestInfo, username: string, large = false) {
  await act(page, 'GET', '/api/v1/system/users', () => page.goto('/system/user'))
  const templateDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: '下载模板', exact: true }).click()
  const template = info.outputPath('template.xlsx')
  await (await templateDownload).saveAs(template)
  const fixture = await prepareFixture(info, username, large)
  await page.getByRole('button', { name: '导入用户', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '创建异步用户导入', exact: true })
  await dialog.locator('input[type=file]').setInputFiles({
    name: `${username}.xlsx`,
    mimeType: XLSX_MEDIA_TYPE,
    buffer: fixture.content,
  })
  const created = await act(page, 'POST', '/api/v1/system/user-imports', () =>
    dialog.getByRole('button', { name: '开始导入', exact: true }).click(),
  )
  await expect(dialog).not.toBeVisible()
  const history = page.getByRole('dialog', { name: '导入历史', exact: true })
  await expect(history).toBeVisible()
  const row = history
    .locator('.imports-table .el-table__body tr')
    .filter({ hasText: `${username}.xlsx` })
  await expect(row).toHaveCount(1)
  return { history, row, created, fixture: fixture.receipt }
}
