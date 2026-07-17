import type { MenuTreeNode } from '@/api/modules/menu'
import type { PermissionTreeNode } from '@/api/modules/permission'
import type { Id } from '@/shared/http/types'

export interface PermissionOption {
  id: Id
  name: string
  code: string
}

export function flattenPermissionOptions(nodes: PermissionTreeNode[]): PermissionOption[] {
  return nodes.flatMap(node => [
    { id: node.id, name: node.name, code: node.code },
    ...flattenPermissionOptions(node.children ?? []),
  ])
}

export function excludeMenuSubtree(tree: MenuTreeNode[], excludedId: Id): MenuTreeNode[] {
  return tree.reduce<MenuTreeNode[]>((result, node) => {
    if (node.id === excludedId) return result
    result.push({
      ...node,
      children: excludeMenuSubtree(node.children ?? [], excludedId),
    })
    return result
  }, [])
}
