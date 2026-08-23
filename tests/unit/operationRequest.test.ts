import { beforeEach, describe, expect, it, vi } from 'vitest'

const httpClient = vi.hoisted(() => ({
  request: vi.fn<(config: unknown) => Promise<unknown>>(),
  rawRequest: vi.fn<(config: unknown) => Promise<unknown>>(),
  requestBlob: vi.fn<(config: unknown) => Promise<Blob>>(),
  requestText: vi.fn<(config: unknown) => Promise<string>>(),
}))

vi.mock('@/shared/http/client', () => ({
  default: httpClient.request,
  rawRequest: httpClient.rawRequest,
  requestBlob: httpClient.requestBlob,
  requestText: httpClient.requestText,
}))

import {
  get_common_file_download,
  get_monitor_metrics,
  get_version,
  post_common_upload,
} from '@/api/generated/operations'
import { getCsrfChallenge, login, logout } from '@/api/modules/auth'
import { downloadFile, uploadFile } from '@/api/modules/common'
import { exportConfig } from '@/api/modules/config'
import { exportDictType } from '@/api/modules/dict'
import {
  cancelExportJob,
  deleteExportJobs,
  downloadExportJob,
  getExportJob,
  listExportJobs,
} from '@/api/modules/exportJob'
import { exportLoginLog, exportOperLog, getMetrics } from '@/api/modules/monitor'
import * as postExtension from '@/api/modules/post'
import * as generatedPostApi from '@/generated/resources/post/api'
import { exportRole } from '@/api/modules/role'
import { getApiVersion } from '@/api/modules/version'
import {
  batchDeleteUser,
  createUser,
  downloadImportTemplate,
  exportUser,
  replaceUserRoles,
} from '@/api/modules/user'
import {
  requestBlobOperation,
  requestMultipartOperation,
  requestOperation,
  requestTextOperation,
} from '@/api/operationRequest'

const versionResponse = {
  code: 200,
  message: 'ok',
  request_id: '0198c700-0000-7000-8000-000000000001',
  data: {
    api_prefix: '/api/v1',
    endpoints: {
      auth: '/auth',
      common: '/common',
      monitor: '/monitor',
      openapi: '/openapi.json',
      swagger: '/swagger-ui',
      system: '/system',
    },
    multi_tenancy_enabled: true,
    name: 'RyFrame',
    source_commit: '0000000000000000000000000000000000000000',
    version: '0.10.0',
  },
}

beforeEach(() => {
  httpClient.request.mockReset()
  httpClient.rawRequest.mockReset()
  httpClient.requestBlob.mockReset()
  httpClient.requestText.mockReset()
})

describe('operation 请求传输模式', () => {
  it('岗位 CRUD 与导出扩展保持独立模块边界', () => {
    expect(Object.keys(postExtension)).toEqual(['exportPost'])
    expect(Object.keys(generatedPostApi).sort()).toEqual([
      'createPost',
      'deletePost',
      'getPost',
      'listPost',
      'updatePost',
    ])
  })

  it('默认使用带会话的请求传输', async () => {
    httpClient.request.mockResolvedValue(versionResponse)

    const response = await requestOperation(get_version, {})

    expect(response).toBe(versionResponse)
    expect(httpClient.request).toHaveBeenCalledWith({ method: 'get', url: '/version' })
    expect(httpClient.rawRequest).not.toHaveBeenCalled()
  })

  it('版本能力查询显式使用 raw 传输且不泄漏控制选项', async () => {
    httpClient.rawRequest.mockResolvedValue(versionResponse)

    const response = await getApiVersion()

    expect(response).toBe(versionResponse)
    expect(httpClient.rawRequest).toHaveBeenCalledWith({ method: 'get', url: '/version' })
    expect(httpClient.request).not.toHaveBeenCalled()
  })

  it('匿名认证调用使用 raw 传输并保留跳过会话处理的标记', async () => {
    httpClient.rawRequest.mockResolvedValue(versionResponse)

    await getCsrfChallenge()
    await logout('csrf-token', 'access-token')

    expect(httpClient.rawRequest).toHaveBeenNthCalledWith(1, {
      method: 'get',
      skipAuthRefresh: true,
      skipTenantHeader: true,
      url: '/auth/csrf',
    })
    expect(httpClient.rawRequest).toHaveBeenNthCalledWith(2, {
      headers: {
        Authorization: 'Bearer access-token',
        'X-CSRF-Token': 'csrf-token',
      },
      method: 'post',
      skipAuthRefresh: true,
      skipTenantHeader: true,
      url: '/auth/logout',
    })
    expect(httpClient.request).not.toHaveBeenCalled()
  })

  it('登录保留显式租户与 CSRF 头且不触发会话刷新', async () => {
    httpClient.request.mockResolvedValue(versionResponse)
    const data = { username: 'admin', password: 'secret' }

    await login(data, 'tenant-a', 'csrf-token')

    expect(httpClient.request).toHaveBeenCalledWith({
      data,
      headers: {
        'X-CSRF-Token': 'csrf-token',
        'X-Tenant-Id': 'tenant-a',
      },
      method: 'post',
      skipAuthRefresh: true,
      url: '/auth/login',
    })
    expect(httpClient.rawRequest).not.toHaveBeenCalled()
  })

  it('multipart operation 保留 FormData 与超时配置', async () => {
    httpClient.request.mockResolvedValue(versionResponse)
    const data = new FormData()

    await requestMultipartOperation(post_common_upload, { data, timeout: 120000 })
    await uploadFile(data)

    expect(httpClient.request).toHaveBeenNthCalledWith(1, {
      data,
      method: 'post',
      timeout: 120000,
      url: '/common/upload',
    })
    expect(httpClient.request).toHaveBeenNthCalledWith(2, {
      data,
      method: 'post',
      timeout: 120000,
      url: '/common/upload',
    })
  })

  it('blob operation 使用 descriptor 路径并保留查询参数', async () => {
    const blob = new Blob(['content'])
    httpClient.requestBlob.mockResolvedValue(blob)

    const direct = await requestBlobOperation(get_common_file_download, {
      params: { path: 'reports/users.xlsx', bucket: 'private' },
    })
    const publicResult = await downloadFile('reports/users.xlsx', 'private')

    expect(direct).toBe(blob)
    expect(publicResult).toBe(blob)
    expect(httpClient.requestBlob).toHaveBeenNthCalledWith(1, {
      method: 'get',
      params: { path: 'reports/users.xlsx', bucket: 'private' },
      url: '/common/file/download',
    })
    expect(httpClient.requestBlob).toHaveBeenNthCalledWith(2, {
      method: 'get',
      params: { path: 'reports/users.xlsx', bucket: 'private' },
      url: '/common/file/download',
    })
  })

  it('文本 operation 使用 descriptor 且保留请求配置', async () => {
    httpClient.requestText.mockResolvedValue('# HELP ryframe_up 进程状态')

    const direct = await requestTextOperation(get_monitor_metrics, { timeout: 5000 })
    const publicResult = await getMetrics()

    expect(direct).toBe('# HELP ryframe_up 进程状态')
    expect(publicResult).toBe('# HELP ryframe_up 进程状态')
    expect(httpClient.requestText).toHaveBeenNthCalledWith(1, {
      method: 'get',
      timeout: 5000,
      url: '/monitor/metrics',
    })
    expect(httpClient.requestText).toHaveBeenNthCalledWith(2, {
      method: 'get',
      url: '/monitor/metrics',
    })
  })

  it('用户 operation 保留角色与批量标识参数', async () => {
    httpClient.request.mockResolvedValue(versionResponse)
    const template = new Blob(['template'])
    httpClient.requestBlob.mockResolvedValue(template)

    await createUser({ username: 'alice', nickname: 'Alice', role_ids: ['9'] })
    await replaceUserRoles('7', ['9', '10'])
    await batchDeleteUser(['7', '8'])
    const downloaded = await downloadImportTemplate()

    expect(httpClient.request).toHaveBeenNthCalledWith(1, {
      data: { username: 'alice', nickname: 'Alice', role_ids: ['9'] },
      method: 'post',
      url: '/system/users',
    })
    expect(httpClient.request).toHaveBeenNthCalledWith(2, {
      data: { role_ids: ['9', '10'] },
      method: 'put',
      url: '/system/users/7/roles',
    })
    expect(httpClient.request).toHaveBeenNthCalledWith(3, {
      method: 'delete',
      url: '/system/users/batch/7%2C8',
    })
    expect(downloaded).toBe(template)
    expect(httpClient.requestBlob).toHaveBeenCalledWith({
      method: 'get',
      url: '/system/users/import-template',
    })
  })

  it('七类导出使用严格筛选包络和 operation 路径', async () => {
    httpClient.request.mockResolvedValue(versionResponse)

    await exportUser({ username: 'alice' }, 'user-key')
    await exportRole({ name: 'operator' }, 'role-key')
    await postExtension.exportPost({ status: '1' }, 'post-key')
    await exportConfig(undefined, 'config-key', undefined, true)
    await exportDictType({ code: 'sys_user_sex' }, 'dict-key')
    await exportOperLog({ oper_name: 'alice' }, 'oper-key')
    await exportLoginLog({ user_name: 'alice' }, 'login-key')

    expect(httpClient.request.mock.calls.map(([config]) => config)).toEqual([
      {
        data: { filter: { username: 'alice' }, confirm_all: false },
        headers: { 'Idempotency-Key': 'user-key' },
        method: 'post',
        url: '/system/users/exports',
      },
      {
        data: { filter: { name: 'operator' }, confirm_all: false },
        headers: { 'Idempotency-Key': 'role-key' },
        method: 'post',
        url: '/system/roles/exports',
      },
      {
        data: { filter: { status: '1' }, confirm_all: false },
        headers: { 'Idempotency-Key': 'post-key' },
        method: 'post',
        url: '/system/posts/exports',
      },
      {
        data: { filter: {}, confirm_all: true },
        headers: { 'Idempotency-Key': 'config-key' },
        method: 'post',
        url: '/system/configs/exports',
      },
      {
        data: { filter: { code: 'sys_user_sex' }, confirm_all: false },
        headers: { 'Idempotency-Key': 'dict-key' },
        method: 'post',
        url: '/system/dict/types/exports',
      },
      {
        data: { filter: { oper_name: 'alice' }, confirm_all: false },
        headers: { 'Idempotency-Key': 'oper-key' },
        method: 'post',
        url: '/system/operlogs/exports',
      },
      {
        data: { filter: { user_name: 'alice' }, confirm_all: false },
        headers: { 'Idempotency-Key': 'login-key' },
        method: 'post',
        url: '/system/loginlogs/exports',
      },
    ])
  })

  it('导出任务操作使用 descriptor 路径', async () => {
    httpClient.request.mockResolvedValue(versionResponse)
    const artifact = new Blob(['export'])
    httpClient.requestBlob.mockResolvedValue(artifact)

    await listExportJobs()
    await getExportJob('job/1')
    await cancelExportJob('job/1')
    await deleteExportJobs(['job-2', 'job-1'], 'delete-key')
    const downloaded = await downloadExportJob('job/1')

    expect(httpClient.request.mock.calls.map(([config]) => config)).toEqual([
      { method: 'get', url: '/common/jobs' },
      { method: 'get', url: '/common/jobs/job%2F1' },
      { data: {}, method: 'post', url: '/common/jobs/job%2F1/cancel' },
      {
        data: { ids: ['job-2', 'job-1'] },
        headers: { 'Idempotency-Key': 'delete-key' },
        method: 'post',
        url: '/common/jobs/deletions',
      },
    ])
    expect(downloaded).toBe(artifact)
    expect(httpClient.requestBlob).toHaveBeenCalledWith({
      method: 'get',
      url: '/common/jobs/job%2F1/download',
    })
  })
})
