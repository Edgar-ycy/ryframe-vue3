import { createPinia, setActivePinia } from 'pinia'
import {
  createRenderer,
  defineComponent,
  h,
  nextTick,
  resolveDirective,
  withDirectives,
} from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useUserStore } from '@/stores/user'
import type { PermissionValue } from '@/utils/permission'
import directives from './index'

vi.mock('@/app/session/sessionCoordinator', () => ({
  ensureCsrfToken: vi.fn(),
  publishAuthenticatedSession: vi.fn(),
}))

interface HostNode {
  type: string
  parentNode: HostNode | null
  children: HostNode[]
  text?: string
  hidden?: boolean
  inert?: boolean
  disabled?: boolean
  removeChild(child: HostNode): HostNode
}

function createHostNode(type: string, text?: string): HostNode {
  return {
    type,
    parentNode: null,
    children: [],
    text,
    removeChild(child) {
      const index = this.children.indexOf(child)
      if (index >= 0) this.children.splice(index, 1)
      child.parentNode = null
      return child
    },
  }
}

function insertNode(child: HostNode, parent: HostNode, anchor?: HostNode | null): void {
  child.parentNode?.removeChild(child)
  child.parentNode = parent
  const anchorIndex = anchor ? parent.children.indexOf(anchor) : -1
  if (anchorIndex >= 0) parent.children.splice(anchorIndex, 0, child)
  else parent.children.push(child)
}

const renderer = createRenderer<HostNode, HostNode>({
  patchProp: () => undefined,
  insert: insertNode,
  remove(child) {
    child.parentNode?.removeChild(child)
  },
  createElement: type => createHostNode(type),
  createText: text => createHostNode('text', text),
  createComment: text => createHostNode('comment', text),
  setText(node, text) {
    node.text = text
  },
  setElementText(node, text) {
    node.text = text
    node.children = []
  },
  parentNode: node => node.parentNode,
  nextSibling(node) {
    if (!node.parentNode) return null
    const index = node.parentNode.children.indexOf(node)
    return node.parentNode.children[index + 1] ?? null
  },
  insertStaticContent(content, parent, anchor) {
    const node = createHostNode('static', content)
    insertNode(node, parent, anchor)
    return [node, node]
  },
})

function mountPermissionButton(
  required: PermissionValue,
  permissions: string[] = [],
  roles: string[] = [],
) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const user = useUserStore(pinia)
  user.permissions = permissions
  user.roles = roles

  const root = defineComponent({
    setup() {
      return () => {
        const permission = resolveDirective('perm')
        if (!permission) throw new Error('perm directive was not installed')
        return withDirectives(h('button', 'restricted action'), [[permission, required]])
      }
    },
  })
  const container = createHostNode('root')
  const app = renderer.createApp(root)
  app.use(pinia)
  app.use(directives)
  app.mount(container)

  return { app, container, user }
}

describe('permission directive', () => {
  it('hides a mounted action when the current user lacks its permission and restores it after refresh', async () => {
    const { app, container, user } = mountPermissionButton(
      'system:user:remove',
      ['system:user:list'],
    )

    expect(container.children.map(node => node.type)).toEqual(['button'])
    expect(container.children[0]?.hidden).toBe(true)
    expect(container.children[0]?.inert).toBe(true)

    user.permissions = ['system:user:remove']
    await nextTick()

    expect(container.children[0]?.hidden).toBe(false)
    expect(container.children[0]?.inert).toBe(false)
    app.unmount()
  })

  it('keeps mounted actions for matching wildcard permissions and admin roles', () => {
    const wildcard = mountPermissionButton(
      ['system:user:edit', 'system:user:remove'],
      ['system:user:*'],
    )
    expect(wildcard.container.children.map(node => node.type)).toEqual(['button'])
    wildcard.app.unmount()

    const admin = mountPermissionButton('tenant:status', [], ['admin'])
    expect(admin.container.children.map(node => node.type)).toEqual(['button'])
    admin.app.unmount()
  })
})
