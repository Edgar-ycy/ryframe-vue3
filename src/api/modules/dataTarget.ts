import {
  get_platform_data_targets,
  get_platform_data_targets_by_target_key,
} from '@/api/generated/operations/platform'
import type { OperationData, OperationQuery } from '@/api/contract'
import { HttpError, requireOperationData } from '@/shared/http/client'

/** 平台接口只返回可展示的目标元数据，绝不包含连接串或凭据。 */
export type DataTargetPage = OperationData<'get_platform_data_targets'>
export type DataTargetSummary = DataTargetPage['items'][number]
export type DataTargetDetail = OperationData<'get_platform_data_targets_by_target_key'>
export type DataTargetQuery = OperationQuery<'get_platform_data_targets'>

export function listDataTargets(params?: DataTargetQuery, signal?: AbortSignal) {
  return get_platform_data_targets({ params, signal })
}

export function getDataTarget(targetKey: string, signal?: AbortSignal) {
  return get_platform_data_targets_by_target_key({
    path: { target_key: targetKey },
    signal,
  })
}

/** 选择器最多汇总已配置的 200 个目标；每页仍由服务端分页且不会逐目标探测数据库。 */
export async function listAllDataTargetOptions(
  params?: Omit<DataTargetQuery, 'page' | 'page_size'>,
  signal?: AbortSignal,
): Promise<DataTargetSummary[]> {
  const items: DataTargetSummary[] = []
  let page = 1
  let totalPages = 1
  do {
    const result = requireOperationData(
      await listDataTargets(
        {
          ...params,
          page,
          page_size: 100,
        },
        signal,
      ),
    )
    if (result.total > 200 || result.total_pages > 2) {
      throw new HttpError('数据目标数量超过当前产品支持的 200 个上限', {
        kind: 'invalid_response',
      })
    }
    items.push(...result.items)
    totalPages = result.total_pages
    page += 1
  } while (page <= totalPages)
  return items
}
