import { describe, expect, it } from 'vitest'
import {
  buildApiBaseUrl,
  normalizeApiOrigin,
  normalizeApiPrefix,
} from './apiEndpoint'

describe('API 端点契约', () => {
  it('使用 origin 和后端前缀构造唯一基础地址', () => {
    const prefix = normalizeApiPrefix({ version: 1, value: '/api/v1' })
    const origin = normalizeApiOrigin('https://api.example.com', 'https://unused.example.com')

    expect(buildApiBaseUrl(origin, prefix)).toBe('https://api.example.com/api/v1')
  })

  it('未配置 origin 时使用当前页面 origin', () => {
    expect(normalizeApiOrigin(undefined, 'http://127.0.0.1:5173'))
      .toBe('http://127.0.0.1:5173')
  })

  it.each([
    'https://api.example.com/api/v1',
    'https://api.example.com?tenant=1',
    'https://user:secret@api.example.com',
    '/api/v1',
    'javascript:alert(1)',
  ])('拒绝包含路径或非 HTTP(S) 协议的 origin：%s', (origin) => {
    expect(() => normalizeApiOrigin(origin, 'http://127.0.0.1:5173')).toThrow()
  })

  it('拒绝不受支持的生成前缀', () => {
    expect(() => normalizeApiPrefix({ version: 1, value: '/api/v0' })).toThrow()
    expect(() => normalizeApiPrefix({ version: 2, value: '/api/v1' })).toThrow()
  })
})
