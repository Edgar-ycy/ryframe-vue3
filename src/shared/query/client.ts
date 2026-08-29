import { readonly, shallowRef, type DeepReadonly, type Ref } from 'vue'
import { MutationCache, QueryCache, QueryClient } from '@tanstack/vue-query'
import { HttpError } from '@/shared/http/client'
import type {
  ActiveServerStateScope,
  ServerStateQueryKey,
  ServerStateScope,
  ServerStateScopeIdentity,
} from './scope'
import { sameServerStateScope } from './scope'

const SERVER_STATE_PREFIX = 'server-state'
export type ServerStateErrorMode = 'global' | 'silent'
export interface ServerStateMeta extends Record<string, unknown> {
  errorMode?: ServerStateErrorMode
}
type ServerStateErrorReporter = (error: HttpError) => void

declare module '@tanstack/vue-query' {
  interface Register {
    queryMeta: ServerStateMeta
    mutationMeta: ServerStateMeta
  }
}

let errorReporter: ServerStateErrorReporter | undefined
let sessionEpoch = 0
let authorizationFingerprint = ''
let sessionController: AbortController | undefined
const activeScope = shallowRef<ActiveServerStateScope>()
const readonlyActiveScope = readonly(activeScope)

/** 配置 Query/Mutation Cache 唯一的全局错误出口。 */
export function configureServerStateErrorReporter(
  reporter: ServerStateErrorReporter | undefined,
): void {
  errorReporter = reporter
}

function errorMode(meta: ServerStateMeta | undefined): ServerStateErrorMode {
  return meta?.errorMode ?? 'global'
}

function normalizeServerStateError(error: unknown): HttpError {
  return error instanceof HttpError
    ? error
    : new HttpError(error instanceof Error ? error.message : '服务端状态请求失败', {
        kind: 'unknown',
        cause: error,
      })
}

/** 页面显式接管错误展示时仍复用全局 reporter，并返回规范化错误供继续传播。 */
export function reportServerStatePageError(error: unknown): HttpError {
  const normalized = normalizeServerStateError(error)
  if (normalized.kind !== 'cancelled') errorReporter?.(normalized)
  return normalized
}

function reportServerStateError(error: unknown, meta: ServerStateMeta | undefined): void {
  if (errorMode(meta) === 'silent') return
  reportServerStatePageError(error)
}

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof HttpError) {
    // 主动取消不是失败，不应重新发起已失效的请求。
    if (error.kind === 'cancelled') return false
    if (error.status !== undefined && error.status < 500) return false
  }
  return failureCount < 2
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => reportServerStateError(error, query.meta),
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _onMutateResult, mutation) => {
      reportServerStateError(error, mutation.meta)
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      retry: shouldRetry,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
    mutations: {
      retry: false,
    },
  },
})

export function useServerStateScope(): DeepReadonly<Ref<ActiveServerStateScope | undefined>> {
  return readonlyActiveScope
}

export function getServerStateScope(): ActiveServerStateScope | undefined {
  return activeScope.value
}

export function getServerStateSessionEpoch(): number {
  return sessionEpoch
}

export function assertServerStateScopeCurrent(expected: ServerStateScope, cause?: unknown): void {
  if (!isServerStateScopeCurrent(expected)) {
    throw new HttpError('会话已切换，请求已取消', {
      status: 401,
      kind: 'cancelled',
      cause,
    })
  }
}

export function isServerStateScopeCurrent(expected: ServerStateScope): boolean {
  return (
    sameServerStateScope(expected, activeScope.value) && activeScope.value?.signal.aborted !== true
  )
}

/**
 * 原子切换已认证服务端状态范围。先撤销并移除旧缓存，再发布新范围，
 * 避免活跃观察者在同一租户内切换用户或授权快照后继续展示旧结果。
 */
export function transitionServerStateScope(
  identity: ServerStateScopeIdentity,
  applyProjection: () => void,
  options: { force?: boolean } = {},
): boolean {
  const current = activeScope.value
  const unchanged =
    current?.tenantId === identity.tenantId &&
    current.subjectId === identity.subjectId &&
    authorizationFingerprint === identity.authorizationFingerprint
  if (unchanged && !options.force) {
    try {
      applyProjection()
      return false
    } catch (error) {
      deactivateServerStateScope()
      throw error
    }
  }

  sessionController?.abort()
  activeScope.value = undefined
  sessionController = undefined
  authorizationFingerprint = ''
  sessionEpoch += 1
  queryClient.clear()

  // 所有已校验的客户端投影必须先同步完成，活跃观察者随后才能看到新范围。
  applyProjection()

  authorizationFingerprint = identity.authorizationFingerprint
  sessionController = new AbortController()
  activeScope.value = {
    tenantId: identity.tenantId,
    subjectId: identity.subjectId,
    sessionEpoch,
    signal: sessionController.signal,
  }
  return true
}

/** 失败关闭或退出时同步撤销请求、隐藏观察结果并清空全部服务端状态。 */
export function deactivateServerStateScope(): void {
  sessionController?.abort()
  sessionController = undefined
  authorizationFingerprint = ''
  activeScope.value = undefined
  sessionEpoch += 1
  queryClient.clear()
}

export function serverStateScopePrefix(scope: ServerStateScope) {
  return [SERVER_STATE_PREFIX, scope.tenantId, scope.subjectId, scope.sessionEpoch] as const
}

export function serverStateResourcePrefix(scope: ServerStateScope, resource: string) {
  return [...serverStateScopePrefix(scope), resource] as const
}

/** 请求参数保持普通值，使 Vue Query 能确定性比较完整会话范围。 */
export function serverStateQueryKey(
  scope: ServerStateScope,
  resource: string,
  params?: unknown,
): ServerStateQueryKey {
  return [...serverStateResourcePrefix(scope, resource), params ?? null] as const
}

export function serverStateMutationKey(scope: ServerStateScope, resource: string) {
  return [...serverStateResourcePrefix(scope, resource), 'mutation'] as const
}

export function invalidateServerStateScope(scope: ServerStateScope): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: serverStateScopePrefix(scope) })
}

export function invalidateActiveServerStateScope(): Promise<void> {
  const scope = activeScope.value
  return scope ? invalidateServerStateScope(scope) : Promise.resolve()
}

/** 将当前会话范围内资源的所有缓存变体标记为过期，不盲目触发请求。 */
export function invalidateServerStateResource(
  scope: ServerStateScope,
  resource: string,
): Promise<void> {
  return queryClient.invalidateQueries({
    queryKey: serverStateResourcePrefix(scope, resource),
    refetchType: 'none',
  })
}

export function invalidateActiveServerStateResource(resource: string): Promise<void> {
  const scope = activeScope.value
  return scope ? invalidateServerStateResource(scope, resource) : Promise.resolve()
}
