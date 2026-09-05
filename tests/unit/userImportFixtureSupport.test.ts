import { createHash } from 'node:crypto'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  attachVerifiedUserImportFixture,
  parseUserImportFixtureReceipt,
  verifyUserImportFixtureContent,
} from '../browser-real/import-support'

const output = path.resolve('import-1234abcd.xlsx')
const templateSha256 = createHash('sha256').update('template').digest('hex')
const expected = {
  path: output,
  templateSha256,
  username: 'import-1234abcd',
  large: false,
}

function fixture(overrides: Record<string, unknown> = {}) {
  return {
    path: output,
    bytes: 7,
    sha256: createHash('sha256').update('fixture').digest('hex'),
    template_sha256: templateSha256,
    username: expected.username,
    rows: 3,
    large: false,
    ...overrides,
  }
}

function receipt(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({ ok: true, fixture: fixture(overrides) })
}

describe('用户导入 fixture 收据', () => {
  it('只接受与本次路径、用户名和场景完全匹配的收据', () => {
    expect(parseUserImportFixtureReceipt(receipt(), expected)).toEqual(fixture())
    for (const value of [
      'not-json',
      JSON.stringify({ ok: false, fixture: fixture() }),
      JSON.stringify({ ok: true, fixture: fixture(), extra: true }),
      receipt({ path: path.resolve('other.xlsx') }),
      receipt({ username: 'import-deadbeef' }),
      receipt({ rows: 2 }),
      receipt({ large: true }),
      receipt({ bytes: 10 * 1024 * 1024 + 1 }),
      receipt({ sha256: 'invalid' }),
      receipt({ template_sha256: '0'.repeat(64) }),
      receipt({ extra: true }),
    ]) {
      expect(() => parseUserImportFixtureReceipt(value, expected)).toThrow()
    }
  })

  it('上传前重新核对实际字节数和 SHA-256', () => {
    const parsed = parseUserImportFixtureReceipt(receipt(), expected)
    expect(() => verifyUserImportFixtureContent(parsed, Buffer.from('fixture'))).not.toThrow()
    expect(() => verifyUserImportFixtureContent(parsed, Buffer.from('changed'))).toThrow(
      '用户导入 fixture 在上传前发生变化',
    )
  })

  it('只在内容核验后附加完整的非敏感 JSON 收据', async () => {
    const parsed = parseUserImportFixtureReceipt(receipt(), expected)
    const attachments: Array<{ name: string; body: string; contentType: string }> = []
    const info: Pick<import('@playwright/test').TestInfo, 'attach'> = {
      attach: async (
        name: string,
        options?: { body?: string | Buffer; contentType?: string; path?: string },
      ) => {
        attachments.push({
          name,
          body: String(options?.body),
          contentType: options?.contentType ?? '',
        })
      },
    }

    await attachVerifiedUserImportFixture(info, parsed, Buffer.from('fixture'))
    expect(attachments).toEqual([
      {
        name: 'import-1234abcd-fixture-receipt.json',
        body: `${JSON.stringify(parsed, null, 2)}\n`,
        contentType: 'application/json',
      },
    ])
    await expect(
      attachVerifiedUserImportFixture(info, parsed, Buffer.from('changed')),
    ).rejects.toThrow('用户导入 fixture 在上传前发生变化')
    expect(attachments).toHaveLength(1)
  })

  it('大文件收据必须严格大于 2 MiB 且不超过 10 MiB', () => {
    const largeExpected = { ...expected, large: true }
    const largeReceipt = (bytes: number) => receipt({ bytes, large: true })

    expect(() =>
      parseUserImportFixtureReceipt(largeReceipt(2 * 1024 * 1024), largeExpected),
    ).toThrow('用户导入 fixture 收据与本次请求不一致')
    expect(() =>
      parseUserImportFixtureReceipt(largeReceipt(2 * 1024 * 1024 + 1), largeExpected),
    ).not.toThrow()
    expect(() =>
      parseUserImportFixtureReceipt(largeReceipt(10 * 1024 * 1024), largeExpected),
    ).not.toThrow()
  })
})
