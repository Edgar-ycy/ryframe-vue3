/**
 * 此文件由 OpenAPI 契约自动生成。
 * 请勿直接修改此文件。
 */

export const permissionCatalog = [
  "monitor:cache:list",
  "monitor:db-pool:list",
  "monitor:job:list",
  "monitor:job:retry",
  "monitor:online:force-logout",
  "monitor:online:list",
  "monitor:runtime:list",
  "monitor:server:list",
  "system:config:add",
  "system:config:edit",
  "system:config:export",
  "system:config:list",
  "system:config:remove",
  "system:dept:add",
  "system:dept:edit",
  "system:dept:list",
  "system:dept:remove",
  "system:dict:add",
  "system:dict:edit",
  "system:dict:export",
  "system:dict:list",
  "system:dict:remove",
  "system:logininfor:export",
  "system:logininfor:list",
  "system:menu:add",
  "system:menu:edit",
  "system:menu:list",
  "system:menu:remove",
  "system:message:publish",
  "system:notice:add",
  "system:notice:edit",
  "system:notice:list",
  "system:notice:remove",
  "system:operlog:export",
  "system:operlog:list",
  "system:perm:add",
  "system:perm:edit",
  "system:perm:list",
  "system:perm:remove",
  "system:perm:sync",
  "system:post:add",
  "system:post:edit",
  "system:post:export",
  "system:post:list",
  "system:post:remove",
  "system:role:add",
  "system:role:edit",
  "system:role:export",
  "system:role:list",
  "system:role:remove",
  "system:user:add",
  "system:user:edit",
  "system:user:export",
  "system:user:list",
  "system:user:remove",
  "tenant:add",
  "tenant:edit",
  "tenant:list",
  "tenant:status",
  "tools:gen:add",
  "tools:gen:list"
] as const

export type PermissionCode = typeof permissionCatalog[number]

const permissionCodeSet: ReadonlySet<string> = new Set(permissionCatalog)

export function isPermissionCode(value: string): value is PermissionCode {
  return permissionCodeSet.has(value)
}
