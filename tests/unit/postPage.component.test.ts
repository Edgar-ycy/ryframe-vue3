import { renderToString } from 'vue/server-renderer'
import { createSSRApp, h } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import { findCrudResource } from '@/api/generated/crudResources'
import { i18n } from '@/i18n'
import PostPage from '@/generated/resources/post/page.vue'

const crudScenario = vi.hoisted(() => ({
  canExport: false,
  lastSuccessfulQuery: null as unknown,
}))

vi.mock('@/components/business/flat-crud', async () => {
  const { defineComponent, h, ref } = await vi.importActual<typeof import('vue')>('vue')
  const empty = () => undefined

  return {
    FlatCrudPage: defineComponent({
      setup(_props, { slots }) {
        return () =>
          h('div', { 'data-has-actions': String(Boolean(slots.actions)) }, slots.actions?.())
      },
    }),
    defineFlatCrudResource: <T>(resource: T): T => resource,
    useFlatCrudResource: () => ({
      add: empty,
      canExport: ref(crudScenario.canExport),
      changePage: empty,
      deletingKey: ref(null),
      dialogTitle: ref(''),
      dialogVisible: ref(false),
      edit: empty,
      editing: ref(false),
      form: ref({}),
      lastSuccessfulQuery: ref(crudScenario.lastSuccessfulQuery),
      listQuery: {
        data: ref(undefined),
        isFetching: ref(false),
      },
      page: ref(1),
      pageSize: ref(10),
      query: ref({}),
      remove: empty,
      reset: empty,
      saving: ref(false),
      search: empty,
      setQuery: empty,
      submit: empty,
    }),
  }
})

async function renderPostPage(
  withActions: boolean,
  scenario: { canExport: boolean; lastSuccessfulQuery: unknown },
): Promise<string> {
  crudScenario.canExport = scenario.canExport
  crudScenario.lastSuccessfulQuery = scenario.lastSuccessfulQuery
  const app = createSSRApp({
    render: () =>
      h(
        PostPage,
        null,
        withActions
          ? {
              actions: (props: { canExport: boolean; lastSuccessfulQuery: unknown }) =>
                h(
                  'span',
                  { id: 'post-actions' },
                  `${props.canExport}:${JSON.stringify(props.lastSuccessfulQuery)}`,
                ),
            }
          : undefined,
      ),
  })
  app.use(i18n)
  return renderToString(app)
}

describe('生成的岗位页面', () => {
  it('从生成契约读取导出扩展权限', () => {
    expect(findCrudResource('post').extension_permissions.export).toBe('system:post:export')
  })

  it('只在扩展存在时转发操作插槽，并保持查询状态一致', async () => {
    const initial = { canExport: false, lastSuccessfulQuery: null }
    const successfulQuery = { name: '研发' }
    const withoutActions = await renderPostPage(false, initial)
    const beforeQuery = await renderPostPage(true, initial)
    const afterQuery = await renderPostPage(true, {
      canExport: true,
      lastSuccessfulQuery: successfulQuery,
    })

    expect(withoutActions).toContain('data-has-actions="false"')
    expect(withoutActions).not.toContain('id="post-actions"')
    expect(beforeQuery).toContain('data-has-actions="true"')
    expect(beforeQuery).toContain('false:null')
    expect(afterQuery).toContain('true:{&quot;name&quot;:&quot;研发&quot;}')
  })
})
