import { describe, expect, it } from 'vitest'

import { createPostPresentation } from '@/generated/resources/post'

const translate = (key: string, params?: Record<string, string>) => (
  params?.name ? `${key}:${params.name}` : key
)

describe('平面资源描述', () => {
  it('岗位资源保持强类型字段顺序和权限', () => {
    const presentation = createPostPresentation(translate, value => `date:${value}`)

    expect(presentation.queryFields.map(field => field.key)).toEqual(['name', 'code', 'status'])
    expect(presentation.columns.map(column => column.key)).toEqual([
      'id',
      'name',
      'code',
      'sort',
      'status',
      'created_at',
    ])
    expect(presentation.formFields.map(field => field.key)).toEqual([
      'name',
      'code',
      'sort',
      'status',
    ])
    expect(presentation.permissions).toEqual({
      list: 'system:post:list',
      create: 'system:post:add',
      update: 'system:post:edit',
      remove: 'system:post:remove',
    })
  })

  it('创建与更新输入只包含各自允许的字段', () => {
    const resource = createPostPresentation(translate, String).resource
    const form = { name: '平台岗位', code: 'platform', sort: 8, status: '0' }

    expect(resource.createInput(form)).toEqual({
      name: '平台岗位',
      code: 'platform',
      sort: 8,
    })
    expect(resource.updateInput(form)).toEqual({
      name: '平台岗位',
      sort: 8,
      status: '0',
    })
  })
})
