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

import { exportConfig } from '@/api/modules/config'
import { exportDictType } from '@/api/modules/dict'
import {
  cancelExportJob,
  deleteExportJobs,
  downloadExportJob,
  getExportJob,
  listExportJobs,
} from '@/api/modules/exportJob'
import { exportLoginLog, exportOperLog } from '@/api/modules/monitor'
import { exportPost } from '@/api/modules/post'
import { exportRole } from '@/api/modules/role'
import {
  batchDeleteUser,
  createUser,
  downloadImportTemplate,
  exportUser,
  replaceUserRoles,
} from '@/api/modules/user'

beforeEach(() => {
  httpClient.request.mockReset()
  httpClient.rawRequest.mockReset()
  httpClient.requestBlob.mockReset()
  httpClient.requestText.mockReset()
})

describe('operation 领域请求', () => {
  it('用户 operation 保留角色与批量标识参数', async () => {
    httpClient.request.mockResolvedValue({})
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
    httpClient.request.mockResolvedValue({})

    await exportUser({ username: 'alice' }, 'user-key')
    await exportRole({ name: 'operator' }, 'role-key')
    await exportPost({ status: '1' }, 'post-key')
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
    httpClient.request.mockResolvedValue({})
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
