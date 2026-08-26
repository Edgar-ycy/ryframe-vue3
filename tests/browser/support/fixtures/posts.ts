import { expect } from '@playwright/test'
import { fulfillJson, type FixtureHandler } from '../http'
import type { ApiFixtureState, PostFixture } from '../types'
import { NOW } from '../types'

export function createPostHandler(state: ApiFixtureState): FixtureHandler {
  const posts: PostFixture[] = [
    {
      code: 'tester',
      created_at: NOW,
      id: '2001',
      name: '测试岗位',
      remark: null,
      sort: 1,
      status: '1',
    },
  ]

  return async ({ key, method, path, request, route, url }) => {
    if (path === '/system/posts' || path.startsWith('/system/posts/')) {
      state.postRequestContexts.push({
        authorization: request.headers().authorization,
        tenantId: request.headers()['x-tenant-id'],
      })
    }
    if (key === 'GET /system/posts') {
      const name = (url.searchParams.get('name') ?? '').trim()
      const code = (url.searchParams.get('code') ?? '').trim()
      const status = (url.searchParams.get('status') ?? '').trim()
      const items = posts.filter(
        (post) =>
          (!name || post.name.includes(name)) &&
          (!code || post.code.includes(code)) &&
          (!status || post.status === status),
      )
      await fulfillJson(route, {
        items,
        max_page_size: 100,
        page: Number(url.searchParams.get('page') ?? 1),
        page_size: Number(url.searchParams.get('page_size') ?? 10),
        total: items.length,
        total_pages: items.length > 0 ? 1 : 0,
      })
      return true
    }
    if (key === 'POST /system/posts') {
      const body = request.postDataJSON() as { code: string; name: string; sort?: number | null }
      state.postCreateBodies.push(body)
      const created: PostFixture = {
        code: body.code,
        created_at: NOW,
        id: '2002',
        name: body.name,
        remark: null,
        sort: body.sort ?? 0,
        status: '1',
      }
      posts.push(created)
      await fulfillJson(route, created)
      return true
    }
    if (key === 'POST /system/posts/exports') {
      state.postExportBodies.push(request.postDataJSON())
      expect(request.headers()['idempotency-key']).toBeTruthy()
      await fulfillJson(route, {
        completed_at: NOW,
        created_at: NOW,
        id: 'job-post-filtered',
        matched_rows: 1,
        resource: 'posts',
        result_file_name: 'filtered-posts.xlsx',
        snapshot_at: NOW,
        status: 'queued',
        updated_at: NOW,
      })
      return true
    }
    const detailMatch = /^\/system\/posts\/([^/]+)$/u.exec(path)
    if (method === 'GET' && detailMatch) {
      const post = posts.find((item) => item.id === decodeURIComponent(detailMatch[1]))
      await fulfillJson(route, post ?? undefined, post ? 200 : 404)
      return true
    }
    if (method === 'PUT' && detailMatch) {
      const id = decodeURIComponent(detailMatch[1])
      const body = request.postDataJSON() as { name: string; sort?: number | null; status: string }
      state.postUpdateBodies.push({ body, id })
      const post = posts.find((item) => item.id === id)
      if (!post) throw new Error(`岗位 fixture 不存在：${id}`)
      Object.assign(post, { name: body.name, sort: body.sort ?? 0, status: body.status })
      await fulfillJson(route, post)
      return true
    }
    if (method === 'DELETE' && detailMatch) {
      const id = decodeURIComponent(detailMatch[1])
      state.postDeleteIds.push(id)
      const index = posts.findIndex((item) => item.id === id)
      expect(index).toBeGreaterThanOrEqual(0)
      posts.splice(index, 1)
      await fulfillJson(route, null)
      return true
    }
    return false
  }
}
