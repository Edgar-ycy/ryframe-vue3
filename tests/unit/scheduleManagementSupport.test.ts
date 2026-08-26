import { describe, expect, it } from 'vitest'
import type { CreateScheduleBody, ScheduleQuery, UpdateScheduleBody } from '@/api/modules/monitor'
import {
  isUpdatePayload,
  normalizeQueryParams,
} from '@/views/monitor/schedules/scheduleManagementSupport'

describe('定时任务页面模型', () => {
  it('清理空白筛选条件并保留有效布尔值', () => {
    const params = normalizeQueryParams({
      page: 2,
      page_size: 20,
      name: '  清理任务  ',
      handler_key: '   ',
      enabled: false,
    } satisfies ScheduleQuery)

    expect(params).toEqual({
      page: 2,
      page_size: 20,
      name: '清理任务',
      handler_key: undefined,
      enabled: false,
    })
  })

  it('仅将带版本栅栏的保存数据识别为更新', () => {
    const createPayload = {} as CreateScheduleBody
    const updatePayload = { version: 3 } as UpdateScheduleBody

    expect(isUpdatePayload(createPayload)).toBe(false)
    expect(isUpdatePayload(updatePayload)).toBe(true)
  })
})
