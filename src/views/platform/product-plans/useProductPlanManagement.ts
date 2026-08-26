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
import { useTenantMutation } from '@/shared/query/useTenantMutation'
import { useTenantQuery } from '@/shared/query/useTenantQuery'
import { useUserStore } from '@/stores/user'
import { hasPermission } from '@/utils/permission'

const PLANS_RESOURCE = 'platform-product-plans'
const VERSIONS_RESOURCE = 'platform-product-plan-versions'

type SavePlanCommand = { planId?: string; data: ProductPlanFormInput }
type VersionCommand = { planId: string; version?: number; data: ProductPlanVersionInput }
type VersionStatusCommand = { planId: string; version: number }

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

  const plansQuery = useTenantQuery(
    () => userStore.tenantId,
    queryEnabled,
    PLANS_RESOURCE,
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

  const versionsQuery = useTenantQuery<ProductPlanVersion[]>(
    () => userStore.tenantId,
    () => queryEnabled.value && selectedPlan.value !== undefined,
    VERSIONS_RESOURCE,
    () => ({ plan_id: selectedPlan.value?.id ?? null }),
    async (signal) => {
      const planId = selectedPlan.value?.id
      if (!planId) return []
      return requireOperationData(await getProductPlan(planId, signal)).versions
    },
    { staleTime: 0 },
  )

  const savePlanMutation = useTenantMutation<ProductPlan, SavePlanCommand>(
    () => userStore.tenantId,
    PLANS_RESOURCE,
    {
      mutationFn: async (command) =>
        requireOperationData(
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
        ),
    },
  )
  const createVersionMutation = useTenantMutation<ProductPlanVersion, VersionCommand>(
    () => userStore.tenantId,
    VERSIONS_RESOURCE,
    {
      mutationFn: async (command) =>
        requireOperationData(
          command.version === undefined
            ? await createProductPlanVersion(command.planId, command.data)
            : await updateProductPlanVersionDraft(command.planId, command.version, command.data),
        ),
    },
  )
  const publishMutation = useTenantMutation<ProductPlanVersion, VersionStatusCommand>(
    () => userStore.tenantId,
    VERSIONS_RESOURCE,
    {
      mutationFn: async (command) =>
        requireOperationData(await publishProductPlanVersion(command.planId, command.version)),
    },
  )
  const retireMutation = useTenantMutation<ProductPlanVersion, VersionStatusCommand>(
    () => userStore.tenantId,
    VERSIONS_RESOURCE,
    {
      mutationFn: async (command) =>
        requireOperationData(await retireProductPlanVersion(command.planId, command.version)),
    },
  )

  async function refresh(): Promise<void> {
    await plansQuery.refetch({ throwOnError: true })
    if (selectedPlan.value) await versionsQuery.refetch({ throwOnError: true })
  }

  async function savePlan(data: ProductPlanFormInput, plan?: ProductPlan): Promise<ProductPlan> {
    const saved = await savePlanMutation.mutateAsync({ planId: plan?.id, data })
    if (selectedPlan.value?.id === saved.id) selectedPlan.value = saved
    await plansQuery.refetch({ throwOnError: true })
    return saved
  }

  async function saveVersion(
    data: ProductPlanVersionInput,
    current?: ProductPlanVersion,
  ): Promise<ProductPlanVersion> {
    const planId = selectedPlan.value?.id
    if (!planId) throw new Error('创建套餐版本前必须先选择套餐')
    const version = await createVersionMutation.mutateAsync({
      planId,
      version: current?.version,
      data,
    })
    await versionsQuery.refetch({ throwOnError: true })
    return version
  }

  async function publishVersion(version: ProductPlanVersion): Promise<void> {
    const planId = selectedPlan.value?.id
    if (!planId) return
    await publishMutation.mutateAsync({ planId, version: version.version })
    await versionsQuery.refetch({ throwOnError: true })
  }

  async function retireVersion(version: ProductPlanVersion): Promise<void> {
    const planId = selectedPlan.value?.id
    if (!planId) return
    await retireMutation.mutateAsync({ planId, version: version.version })
    await versionsQuery.refetch({ throwOnError: true })
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
