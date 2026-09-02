import type {
  ProductPlan,
  ProductPlanFormInput,
  ProductPlanVersion,
  ProductPlanVersionInput,
} from '@/api/modules/productPlan'
import type { PermissionCode } from '@/api/generated/permissions'
import {
  createProductPlan,
  createProductPlanVersion,
  getProductPlan,
  listProductPlans,
  publishProductPlanVersion,
  retireProductPlanVersion,
  updateProductPlan,
  updateProductPlanVersionDraft,
} from '@/api/modules/productPlan'
import { PRODUCT_PLAN_PERMISSIONS } from '@/features/product-plans/permissions'
import { requireOperationData } from '@/shared/http/client'
import { assertServerStateScopeCurrent } from '@/shared/query/client'
import type { ServerStateScope } from '@/shared/query/scope'
import { useServerStateMutation } from '@/shared/query/useServerStateMutation'
import { useServerStateQuery } from '@/shared/query/useServerStateQuery'
import { useUserStore } from '@/stores/user'
import { hasPermission } from '@/utils/permission'
import {
  invalidateProductPlanResources,
  PRODUCT_PLAN_VERSIONS_RESOURCE,
  PRODUCT_PLANS_RESOURCE,
  propagateProductPlanMutationError,
  type AssertProductPlanPageCurrent,
} from './productPlanMutationScope'

type SavePlanCommand = { planId?: string; data: ProductPlanFormInput; scope: ServerStateScope }
type VersionCommand = {
  planId: string
  version?: number
  data: ProductPlanVersionInput
  scope: ServerStateScope
}
type VersionStatusCommand = { planId: string; version: number; scope: ServerStateScope }

export function useProductPlanManagement() {
  const userStore = useUserStore()
  const page = ref(1)
  const pageSize = ref(20)
  const selectedPlan = ref<ProductPlan>()
  const can = (permission: PermissionCode) => hasPermission(userStore.permissions, permission)
  const canList = computed(() => can(PRODUCT_PLAN_PERMISSIONS.list))
  const queryEnabled = computed(
    () =>
      userStore.sessionStatus === 'authenticated' &&
      userStore.tenantId === 'system' &&
      canList.value,
  )

  const plansQuery = useServerStateQuery(
    queryEnabled,
    PRODUCT_PLANS_RESOURCE,
    () => ({ page: page.value, page_size: pageSize.value }),
    async (signal) =>
      requireOperationData(
        await listProductPlans(
          {
            page: page.value,
            page_size: pageSize.value,
          },
          signal,
        ),
      ),
    { staleTime: 0 },
  )

  const versionsQuery = useServerStateQuery<ProductPlanVersion[]>(
    () => queryEnabled.value && selectedPlan.value !== undefined,
    PRODUCT_PLAN_VERSIONS_RESOURCE,
    () => ({ plan_id: selectedPlan.value?.id ?? null }),
    async (signal) => {
      const planId = selectedPlan.value?.id
      if (!planId) return []
      return requireOperationData(await getProductPlan(planId, signal)).versions
    },
    { staleTime: 0 },
  )

  const savePlanMutation = useServerStateMutation<ProductPlan, SavePlanCommand>(
    PRODUCT_PLANS_RESOURCE,
    {
      invalidateOnSuccess: false,
      meta: { errorMode: 'silent' },
      mutationFn: async (command) => {
        assertServerStateScopeCurrent(command.scope)
        return requireOperationData(
          command.planId
            ? await updateProductPlan(command.planId, {
                name: command.data.name,
                description: command.data.description,
                status: command.data.status,
              })
            : await createProductPlan({
                key: command.data.key,
                name: command.data.name,
                description: command.data.description,
              }),
        )
      },
    },
  )
  const createVersionMutation = useServerStateMutation<ProductPlanVersion, VersionCommand>(
    PRODUCT_PLAN_VERSIONS_RESOURCE,
    {
      invalidateOnSuccess: false,
      meta: { errorMode: 'silent' },
      mutationFn: async (command) => {
        assertServerStateScopeCurrent(command.scope)
        return requireOperationData(
          command.version === undefined
            ? await createProductPlanVersion(command.planId, command.data)
            : await updateProductPlanVersionDraft(command.planId, command.version, command.data),
        )
      },
    },
  )
  const publishMutation = useServerStateMutation<ProductPlanVersion, VersionStatusCommand>(
    PRODUCT_PLAN_VERSIONS_RESOURCE,
    {
      invalidateOnSuccess: false,
      meta: { errorMode: 'silent' },
      mutationFn: async (command) => {
        assertServerStateScopeCurrent(command.scope)
        return requireOperationData(
          await publishProductPlanVersion(command.planId, command.version),
        )
      },
    },
  )
  const retireMutation = useServerStateMutation<ProductPlanVersion, VersionStatusCommand>(
    PRODUCT_PLAN_VERSIONS_RESOURCE,
    {
      invalidateOnSuccess: false,
      meta: { errorMode: 'silent' },
      mutationFn: async (command) => {
        assertServerStateScopeCurrent(command.scope)
        return requireOperationData(await retireProductPlanVersion(command.planId, command.version))
      },
    },
  )

  async function refresh(): Promise<void> {
    await plansQuery.refetch({ throwOnError: true })
    if (selectedPlan.value) await versionsQuery.refetch({ throwOnError: true })
  }

  async function savePlan(
    data: ProductPlanFormInput,
    scope: ServerStateScope,
    plan?: ProductPlan,
    assertPageCurrent: AssertProductPlanPageCurrent = () => undefined,
  ): Promise<ProductPlan> {
    assertPageCurrent()
    assertServerStateScopeCurrent(scope)
    let saved: ProductPlan
    try {
      saved = await savePlanMutation.mutateAsync({ planId: plan?.id, data, scope })
    } catch (error) {
      propagateProductPlanMutationError(error, scope, assertPageCurrent)
    }
    assertServerStateScopeCurrent(scope)
    assertPageCurrent()
    if (selectedPlan.value?.id === saved.id) selectedPlan.value = saved
    await invalidateProductPlanResources(scope, false, assertPageCurrent)
    await plansQuery.refetch({ throwOnError: true })
    assertPageCurrent()
    return saved
  }

  async function saveVersion(
    data: ProductPlanVersionInput,
    scope: ServerStateScope,
    current?: ProductPlanVersion,
    assertPageCurrent: AssertProductPlanPageCurrent = () => undefined,
  ): Promise<ProductPlanVersion> {
    assertPageCurrent()
    assertServerStateScopeCurrent(scope)
    const planId = selectedPlan.value?.id
    if (!planId) throw new Error('创建套餐版本前必须先选择套餐')
    let version: ProductPlanVersion
    try {
      version = await createVersionMutation.mutateAsync({
        planId,
        version: current?.version,
        data,
        scope,
      })
    } catch (error) {
      propagateProductPlanMutationError(error, scope, assertPageCurrent)
    }
    assertServerStateScopeCurrent(scope)
    assertPageCurrent()
    await invalidateProductPlanResources(scope, true, assertPageCurrent)
    await Promise.all([
      plansQuery.refetch({ throwOnError: true }),
      versionsQuery.refetch({ throwOnError: true }),
    ])
    assertPageCurrent()
    return version
  }

  async function publishVersion(
    planId: string,
    version: ProductPlanVersion,
    scope: ServerStateScope,
    assertPageCurrent: AssertProductPlanPageCurrent = () => undefined,
  ): Promise<void> {
    assertPageCurrent()
    assertServerStateScopeCurrent(scope)
    try {
      await publishMutation.mutateAsync({ planId, version: version.version, scope })
    } catch (error) {
      propagateProductPlanMutationError(error, scope, assertPageCurrent)
    }
    assertServerStateScopeCurrent(scope)
    assertPageCurrent()
    await invalidateProductPlanResources(scope, true, assertPageCurrent)
    await Promise.all([
      plansQuery.refetch({ throwOnError: true }),
      versionsQuery.refetch({ throwOnError: true }),
    ])
    assertPageCurrent()
  }

  async function retireVersion(
    planId: string,
    version: ProductPlanVersion,
    scope: ServerStateScope,
    assertPageCurrent: AssertProductPlanPageCurrent = () => undefined,
  ): Promise<void> {
    assertPageCurrent()
    assertServerStateScopeCurrent(scope)
    try {
      await retireMutation.mutateAsync({ planId, version: version.version, scope })
    } catch (error) {
      propagateProductPlanMutationError(error, scope, assertPageCurrent)
    }
    assertServerStateScopeCurrent(scope)
    assertPageCurrent()
    await invalidateProductPlanResources(scope, true, assertPageCurrent)
    await Promise.all([
      plansQuery.refetch({ throwOnError: true }),
      versionsQuery.refetch({ throwOnError: true }),
    ])
    assertPageCurrent()
  }

  return {
    canAdd: computed(() => can(PRODUCT_PLAN_PERMISSIONS.add)),
    canEdit: computed(() => can(PRODUCT_PLAN_PERMISSIONS.edit)),
    canList,
    canPublish: computed(() => can(PRODUCT_PLAN_PERMISSIONS.publish)),
    loading: plansQuery.isPending,
    page,
    pageSize,
    plans: plansQuery.data,
    publishPending: publishMutation.pending,
    publishVersion,
    retirePending: retireMutation.pending,
    retireVersion,
    refresh,
    refreshing: plansQuery.isFetching,
    savePending: computed(
      () => savePlanMutation.pending.value || createVersionMutation.pending.value,
    ),
    savePlan,
    saveVersion,
    selectedPlan,
    versions: versionsQuery.data,
    versionsLoading: versionsQuery.isFetching,
  }
}
