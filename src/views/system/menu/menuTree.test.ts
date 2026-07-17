import { describe, expect, it } from 'vitest'
import type { MenuTreeNode } from '@/api/modules/menu'
import type { PermissionTreeNode } from '@/api/modules/permission'
import { excludeMenuSubtree, flattenPermissionOptions } from './menuTree'

function menu(id: string, children: MenuTreeNode[] = []): MenuTreeNode {
  return {
    id,
    name: id,
    menu_type: 'M',
    visible: true,
    status: '1',
    sort: 0,
    children,
  }
}

function permission(
  id: string,
  code: string,
  children: PermissionTreeNode[] = [],
): PermissionTreeNode {
  return {
    id,
    name: id,
    code,
    perm_type: 'api',
    sort: 0,
    status: '1',
    children,
  }
}

describe('menu tree helpers', () => {
  it('removes an edited menu and its descendants from parent options', () => {
    const tree = [menu('root', [menu('edited', [menu('child')]), menu('sibling')])]

    expect(excludeMenuSubtree(tree, 'edited')).toEqual([
      menu('root', [menu('sibling')]),
    ])
  })

  it('flattens permission options without losing hierarchy entries', () => {
    const options = flattenPermissionOptions([
      permission('root', 'system:root', [permission('child', 'system:child')]),
    ])

    expect(options.map(option => option.code)).toEqual(['system:root', 'system:child'])
  })
})
