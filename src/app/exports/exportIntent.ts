import { translate } from '@/i18n'
import type { ServerStateScope } from '@/shared/query/scope'
import { beginServerStatePageOperation } from '@/shared/query/pageOperationScope'
import { confirmAction } from '@/utils/confirmAction'

const PAGINATION_KEYS = new Set(['page', 'page_size'])

export type NormalizedExportFilter<TQuery extends object> = Omit<TQuery, 'page' | 'page_size'>

export interface ExportIntent<TQuery extends object> {
  filter: NormalizedExportFilter<TQuery>
  isEmpty: boolean
  signature: string
}

interface ExportIntentState {
  isEmpty: boolean
}

type ExportAllConfirmation = () => Promise<boolean>
type SubmitScopedExport = (scope: ServerStateScope) => Promise<unknown>

/** 将最后一次成功查询整理为稳定、无分页字段的导出意图。 */
export function normalizeExportIntent<TQuery extends object>(
  resource: string,
  query: TQuery,
): ExportIntent<TQuery> {
  const source = query as Record<string, unknown>
  const filter: Record<string, string | number | boolean> = {}
  let filterCount = 0

  for (const key of Object.keys(source).sort()) {
    if (PAGINATION_KEYS.has(key)) continue

    const value = source[key]
    if (value === null || value === undefined) continue
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (!trimmed) continue
      filter[key] = trimmed
      filterCount += 1
      continue
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      filter[key] = value
      filterCount += 1
    }
  }

  return {
    filter: filter as NormalizedExportFilter<TQuery>,
    isEmpty: filterCount === 0,
    signature: `${resource}:${JSON.stringify(filter)}`,
  }
}

async function requestExportAllConfirmation(): Promise<boolean> {
  return confirmAction(
    translate('exportCenter.exportAllConfirmMessage'),
    translate('exportCenter.exportAllConfirmTitle'),
    {
      type: 'warning',
      confirmButtonText: translate('exportCenter.exportAllConfirmButton'),
    },
  )
}

/** 非空筛选直接通过；空筛选必须在本次操作中再次确认。 */
export async function confirmExportIntent(
  intent: ExportIntentState,
  requestConfirmation: ExportAllConfirmation = requestExportAllConfirmation,
): Promise<boolean> {
  return !intent.isEmpty || requestConfirmation()
}

/** 在显示确认框前固定完整会话范围，过期确认不得触发导出请求。 */
export async function confirmAndSubmitExportIntent(
  intent: ExportIntentState,
  submit: SubmitScopedExport,
  requestConfirmation: ExportAllConfirmation = requestExportAllConfirmation,
): Promise<void> {
  const operation = beginServerStatePageOperation()
  if (!(await confirmExportIntent(intent, requestConfirmation))) return
  if (!operation.isCurrent()) return
  await submit(operation.scope)
}
