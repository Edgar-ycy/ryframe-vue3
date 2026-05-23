/**
 * 树形数据操作工具
 */

export interface TreeNode {
  id: number | string
  name?: string
  children?: TreeNode[]
  [key: string]: any
}

/** 将树形结构扁平化为一维数组（BFS） */
export function flatTree<T extends TreeNode>(tree: T[]): T[] {
  const result: T[] = []
  const queue = [...tree]
  while (queue.length) {
    const node = queue.shift()!
    result.push(node)
    if (node.children?.length) {
      queue.push(...node.children as T[])
    }
  }
  return result
}

/** 在树中查找指定 id 的节点 */
export function findTreeNode<T extends TreeNode>(tree: T[], id: number | string): T | null {
  for (const node of tree) {
    if (node.id === id) return node
    if (node.children?.length) {
      const found = findTreeNode(node.children as T[], id)
      if (found) return found
    }
  }
  return null
}

/** 递归过滤树节点（保留匹配节点及其所有父级路径） */
export function filterTree<T extends TreeNode>(
  tree: T[],
  predicate: (node: T) => boolean,
): T[] {
  return tree.reduce<T[]>((acc, node) => {
    const children = node.children?.length
      ? filterTree(node.children as T[], predicate)
      : []
    if (predicate(node) || children.length) {
      acc.push({ ...node, children } as T)
    }
    return acc
  }, [])
}

/** 遍历树节点执行回调 */
export function traverseTree<T extends TreeNode>(
  tree: T[],
  callback: (node: T) => void,
): void {
  for (const node of tree) {
    callback(node)
    if (node.children?.length) {
      traverseTree(node.children as T[], callback)
    }
  }
}
