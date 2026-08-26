import { expect } from '@playwright/test'
import { fulfillJson, type FixtureHandler } from '../http'
import type { ApiFixtureState, ExportJobFixture } from '../types'
import { EXPIRES_AT, NOW } from '../types'

function createJob(
  id: string,
  resultFileName: string,
  status: string,
  errorMessage: string | null = null,
): ExportJobFixture {
  return {
    completed_at: NOW,
    content_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    created_at: NOW,
    error_message: errorMessage,
    expires_at: EXPIRES_AT,
    file_size: 4,
    id,
    matched_rows: 21,
    notification_read_at: NOW,
    resource: 'users',
    result_file_name: resultFileName,
    snapshot_at: NOW,
    status,
    updated_at: NOW,
  }
}

export function createExportJobHandler(state: ApiFixtureState): FixtureHandler {
  const jobs = [
    createJob('job-1', 'users.xlsx', 'succeeded'),
    createJob('job-2', 'roles.xlsx', 'failed', '生成失败'),
    createJob('job-3', 'posts.xlsx', 'cancelled'),
  ]

  return async ({ key, method, path, request, route }) => {
    if (key === 'POST /system/users/exports') {
      state.exportBodies.push(request.postDataJSON())
      await fulfillJson(route, createJob('job-filtered', 'filtered-users.xlsx', 'queued'))
      return true
    }
    if (key === 'GET /common/jobs') {
      await fulfillJson(route, jobs)
      return true
    }
    if (method === 'GET' && /^\/common\/jobs\/[^/]+\/download$/u.test(path)) {
      await route.fulfill({
        body: 'xlsx',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers: { 'Content-Disposition': 'attachment; filename="users.xlsx"' },
        status: 200,
      })
      return true
    }
    if (key === 'POST /common/jobs/deletions') {
      const body = request.postDataJSON() as { ids: string[] }
      const ids = [...new Set(body.ids)].sort()
      expect(ids.length).toBeGreaterThan(0)
      expect(request.headers()['idempotency-key']).toBeTruthy()
      state.deletionBodies.push({ ids })
      for (const id of ids) {
        const index = jobs.findIndex((job) => job.id === id)
        if (index >= 0) jobs.splice(index, 1)
      }
      await fulfillJson(
        route,
        { accepted_count: ids.length, accepted_ids: ids, removed_unread_count: 0 },
        202,
      )
      return true
    }
    return false
  }
}
