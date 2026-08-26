import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, type MutationOptions } from '@tanstack/vue-query'
import { HttpError } from '@/shared/http/client'
import { invalidateTenantResource, tenantQueryKey } from './client'

export type TenantMutationOptions<TData, TVariables, TOnMutateResult = unknown> = Omit<
  MutationOptions<TData, HttpError, TVariables, TOnMutateResult>,
  'mutationFn' | 'mutationKey' | 'onSuccess'
> & {
  mutationFn: NonNullable<
    MutationOptions<TData, HttpError, TVariables, TOnMutateResult>['mutationFn']
  >
  onSuccess?: NonNullable<
    MutationOptions<TData, HttpError, TVariables, TOnMutateResult>['onSuccess']
  >
}

/**
 * 统一租户范围写操作。成功回调完成后只失效本次写入所属租户的资源缓存，
 * 全局错误展示策略通过 `meta.errorMode` 交给 MutationCache 处理。
 */
export function useTenantMutation<TData, TVariables, TOnMutateResult = unknown>(
  tenantId: MaybeRefOrGetter<string | undefined>,
  resource: string,
  options: TenantMutationOptions<TData, TVariables, TOnMutateResult>,
) {
  const { mutationFn, onSuccess, ...mutationOptions } = options
  const mutation = useMutation<TData, HttpError, TVariables, TOnMutateResult>({
    ...mutationOptions,
    mutationKey: computed(() => [
      ...tenantQueryKey(toValue(tenantId), resource).slice(0, 3),
      'mutation',
    ]),
    mutationFn,
    onSuccess: async (data, variables, onMutateResult, context) => {
      const affectedTenantId = context.mutationKey?.[1]
      try {
        await onSuccess?.(data, variables, onMutateResult, context)
      } finally {
        if (typeof affectedTenantId === 'string' && affectedTenantId !== 'anonymous') {
          await invalidateTenantResource(affectedTenantId, resource)
        }
      }
    },
  })

  return {
    ...mutation,
    pending: mutation.isPending,
  }
}
