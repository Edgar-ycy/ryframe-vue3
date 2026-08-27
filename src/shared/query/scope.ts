/** 服务端状态缓存与写操作共享的已认证会话范围。 */
export interface ServerStateScope {
  tenantId: string
  subjectId: string
  sessionEpoch: number
}

/** 活跃范围额外携带统一取消信号，但信号不参与缓存键。 */
export interface ActiveServerStateScope extends ServerStateScope {
  signal: AbortSignal
}

export interface ServerStateScopeIdentity {
  tenantId: string
  subjectId: string
  authorizationFingerprint: string
}

export function sameServerStateScope(
  left: ServerStateScope | undefined,
  right: ServerStateScope | undefined,
): boolean {
  return (
    left !== undefined &&
    right !== undefined &&
    left.tenantId === right.tenantId &&
    left.subjectId === right.subjectId &&
    left.sessionEpoch === right.sessionEpoch
  )
}
