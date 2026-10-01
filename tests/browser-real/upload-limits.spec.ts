import { expect, type Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { expectNoSeriousAccessibilityViolations } from '../browser/support/accessibility'
import { expectCleanDiagnostics, observeDiagnostics } from '../browser/support/diagnostics'
import { test } from './fixture'
import { isolatedOrigin } from './network'
import { act, isolatedName, login } from './support'
import { largeUploadPng, multipartFileUpload } from './upload-fixture'

const MIB = 1024 * 1024

const uploads = [
  {
    method: 'POST',
    pathname: '/api/v1/common/upload',
    maxFileBytes: 10 * MIB,
    fileName: 'oversized.txt',
    mimeType: 'text/plain',
  },
  {
    method: 'POST',
    pathname: '/api/v1/common/upload/image',
    maxFileBytes: 10 * MIB,
    fileName: 'oversized.png',
    mimeType: 'image/png',
  },
  {
    method: 'POST',
    pathname: '/api/v1/common/upload/avatar',
    maxFileBytes: 5 * MIB,
    fileName: 'oversized.png',
    mimeType: 'image/png',
  },
  {
    method: 'PUT',
    pathname: '/api/v1/auth/profile/avatar',
    maxFileBytes: 5 * MIB,
    fileName: 'oversized.png',
    mimeType: 'image/png',
  },
  {
    method: 'POST',
    pathname: '/api/v1/system/user-imports',
    maxFileBytes: 10 * MIB,
    fileName: 'oversized.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
  {
    method: 'POST',
    pathname: '/api/v1/platform/tenants/system/config-transfers/upload',
    maxFileBytes: 5 * MIB,
    fileName: 'oversized.ryframe-config.zip',
    mimeType: 'application/zip',
  },
] as const

async function authenticatedHeaders(page: Page) {
  await login(page)
  const response = await act(page, 'GET', '/api/v1/system/users', () => page.goto('/system/user'))
  expect(new URL(response.url()).origin).toBe(isolatedOrigin(page.url()))
  const observed = await response.request().allHeaders()
  // 从本次真实登录后的请求捕获上下文，凭据只留内存，不写入附件。
  const headers = Object.fromEntries(
    Object.entries(observed).filter(([name]) =>
      ['authorization', 'x-tenant-id', 'x-forwarded-for', 'accept-language'].includes(name),
    ),
  )
  if (!headers.authorization || !headers['x-tenant-id']) {
    throw new Error('未取得本次已认证上传请求上下文')
  }
  return { ...headers, Connection: 'close' }
}

test('文件大小恰好达到各路由上限时进入对应业务处理', async ({ page }, info) => {
  test.setTimeout(240_000)
  const diagnostics = observeDiagnostics(page)
  const headers = await authenticatedHeaders(page)
  const records = []
  for (const [index, upload] of uploads.slice(0, 4).entries()) {
    const buffer =
      index === 0 ? Buffer.alloc(upload.maxFileBytes, 'x') : largeUploadPng(upload.maxFileBytes)
    expect(buffer.length).toBe(upload.maxFileBytes)
    const response = await page.request.fetch(new URL(upload.pathname, page.url()).href, {
      method: upload.method,
      headers: { ...headers, 'Idempotency-Key': `upload-exact-${randomUUID()}` },
      multipart: {
        file: {
          name: `${isolatedName('exact')}.${index === 0 ? 'txt' : 'png'}`,
          mimeType: index === 0 ? 'text/plain' : 'image/png',
          buffer,
        },
      },
      maxRedirects: 0,
    })
    const body: unknown = await response.json()
    records.push({
      method: upload.method,
      pathname: upload.pathname,
      bytes: buffer.length,
      status: response.status(),
      body,
    })
    expect.soft(response.status(), upload.pathname).toBe(200)
    await response.dispose()
  }
  for (const upload of uploads.slice(4)) {
    const response = await multipartFileUpload(
      new URL(upload.pathname, page.url()),
      upload.method,
      { ...headers, 'Idempotency-Key': `upload-exact-${randomUUID()}` },
      {
        fileBytes: upload.maxFileBytes,
        fileName: upload.fileName,
        mimeType: upload.mimeType,
      },
    )
    records.push({
      method: upload.method,
      pathname: upload.pathname,
      bytes: upload.maxFileBytes,
      sentFileBytes: response.sentFileBytes,
      status: response.status,
    })
    expect
      .soft(response.sentFileBytes, `${upload.pathname} exact sent bytes`)
      .toBe(upload.maxFileBytes)
    // 文件内容有意无效；400 证明完整 multipart 已越过大小边界并到达领域校验。
    expect.soft(response.status, `${upload.pathname} exact domain validation`).toBe(400)
  }
  await info.attach('upload-results.json', {
    body: JSON.stringify(records, null, 2),
    contentType: 'application/json',
  })
  await page.goto('/')
  await expect(page.locator('.navbar .el-avatar img')).toBeVisible()
  await page.waitForLoadState('networkidle')
  await expectNoSeriousAccessibilityViolations(page, '真实上传头像后的首页')
  await expectCleanDiagnostics(page, diagnostics)
})

test('所有上传路由拒绝畸形表单与各自配置上限加一字节的文件', async ({ page }, info) => {
  const diagnostics = observeDiagnostics(page)
  const headers = await authenticatedHeaders(page)
  const records = []
  for (const upload of uploads) {
    const requestHeaders = {
      ...headers,
      'Idempotency-Key': `upload-boundary-${randomUUID()}`,
    }
    const malformedHeaders = {
      ...requestHeaders,
      'Content-Type': 'multipart/form-data; boundary=ryframe-test-boundary',
    }
    const data = Buffer.from('--wrong-boundary\r\n')
    const malformed = await page.request.fetch(new URL(upload.pathname, page.url()).href, {
      method: upload.method,
      headers: malformedHeaders,
      data,
      maxRedirects: 0,
    })
    records.push({
      method: upload.method,
      pathname: upload.pathname,
      name: 'malformed',
      bytes: data.length,
      status: malformed.status(),
    })
    expect.soft(malformed.status(), `${upload.method} ${upload.pathname} malformed`).toBe(400)
    await malformed.dispose()

    const oversized = await multipartFileUpload(
      new URL(upload.pathname, page.url()),
      upload.method,
      requestHeaders,
      {
        fileBytes: upload.maxFileBytes + 1,
        fileName: upload.fileName,
        mimeType: upload.mimeType,
      },
    )
    records.push({
      method: upload.method,
      pathname: upload.pathname,
      name: 'oversized',
      bytes: upload.maxFileBytes + 1,
      sentFileBytes: oversized.sentFileBytes,
      status: oversized.status,
    })
    expect
      .soft(oversized.sentFileBytes, `${upload.method} ${upload.pathname} sent bytes`)
      .toBe(upload.maxFileBytes + 1)
    expect.soft(oversized.status, `${upload.method} ${upload.pathname} limit + 1`).toBe(413)
  }
  await info.attach('upload-rejections.json', {
    body: JSON.stringify(records, null, 2),
    contentType: 'application/json',
  })
  await expectCleanDiagnostics(page, diagnostics)
})
