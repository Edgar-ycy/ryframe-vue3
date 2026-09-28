import { renderToString } from 'vue/server-renderer'
import { createSSRApp, h, ref, type FunctionalComponent } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import RuntimeBackupCard from '@/views/monitor/runtime/RuntimeBackupCard.vue'
import type {
  RuntimeBackupHealthViewModel,
  RuntimeBackupViewModel,
} from '@/views/monitor/runtime/backupPresentation'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    locale: ref('en-US'),
    t: (key: string, values?: { value?: number }) =>
      values?.value === undefined ? key : `${key}:${values.value}`,
  }),
}))

type Backup = RuntimeBackupViewModel
type Health = RuntimeBackupHealthViewModel

const passThrough: FunctionalComponent = (_props, { attrs, slots }) =>
  h('section', attrs, slots.default?.())
passThrough.inheritAttrs = false

const baseHealth: Health = {
  expired_resources: 0,
  invalid_resources: 0,
  last_restore_completed: null,
  last_restore_succeeded: false,
  missing_resources: 0,
  oldest_capture: '2026-09-05T01:02:03Z',
  recovery_point_age_seconds: null,
  required_resources: 7,
  restore_duration_seconds: null,
  restore_overdue: 0,
  restore_running: 0,
}

function backup(overrides: Partial<Backup> = {}): Backup {
  return {
    available: true,
    collector_status: 'available',
    health: baseHealth,
    last_attempt_at: '2026-09-05T01:03:03Z',
    last_success_at: '2026-09-05T01:02:03Z',
    ...overrides,
  }
}

async function renderBackup(value?: Backup | null): Promise<string> {
  const app = createSSRApp({ render: () => h(RuntimeBackupCard, { backup: value }) })
  app.component('ElCard', passThrough)
  app.component('ElCol', passThrough)
  app.component('ElTag', passThrough)
  return renderToString(app)
}

describe('运行时备份状态卡片', () => {
  it('明确区分四种采集状态', async () => {
    const cases = [
      ['available', true, baseHealth, 'backupAvailable', 'success'],
      ['stale', false, baseHealth, 'backupStale', 'warning'],
      ['unavailable', false, baseHealth, 'backupUnavailable', 'danger'],
      ['unknown', false, null, 'backupUnknown', 'info'],
    ] as const

    for (const [collectorStatus, available, health, message, tagType] of cases) {
      const html = await renderBackup(
        backup({ available, collector_status: collectorStatus, health }),
      )
      expect(html).toContain(`monitor.runtime.${message}`)
      expect(html).toContain(`type="${tagType}"`)
      expect(html.includes('monitor.runtime.backupSnapshotUnavailable')).toBe(!available)
    }
  })

  it('没有健康快照时不伪造资源数、异常数或恢复结果', async () => {
    const html = await renderBackup(
      backup({ available: false, collector_status: 'unknown', health: null }),
    )

    expect(html).toContain('monitor.runtime.backupUnknown')
    expect(html).toMatch(/backupRequiredResources<\/span><strong[^>]*>—<\/strong>/u)
    expect(html).toMatch(/backupProblemCount<\/span><strong class=""[^>]*>—<\/strong>/u)
    expect(html).toContain('monitor.runtime.backupNoRestore')
    expect(html).not.toContain('monitor.runtime.backupProblemCountHelp')
    expect(html).toContain('monitor.runtime.backupSnapshotUnavailable')
  })

  it('采集陈旧或失败时继续显示最后一份有效快照并明确提示', async () => {
    for (const collectorStatus of ['stale', 'unavailable'] as const) {
      const html = await renderBackup(
        backup({ available: false, collector_status: collectorStatus, health: baseHealth }),
      )

      expect(html).toMatch(/backupRequiredResources<\/span><strong[^>]*>7<\/strong>/u)
      expect(html).toContain('monitor.runtime.backupMissingResources：0')
      expect(html).toContain('monitor.runtime.backupSnapshotUnavailable')
    }
  })

  it('分别展示最近一次恢复成功与失败', async () => {
    for (const [succeeded, message] of [
      [true, 'backupRestoreSucceeded'],
      [false, 'backupRestoreFailed'],
    ] as const) {
      const html = await renderBackup(
        backup({
          health: {
            ...baseHealth,
            last_restore_completed: '2026-09-05T01:05:03Z',
            last_restore_succeeded: succeeded,
            recovery_point_age_seconds: 3600,
            restore_duration_seconds: 180,
          },
        }),
      )

      expect(html).toContain(`monitor.runtime.${message}`)
      expect(html).toContain('monitor.runtime.backupRestoreDuration：monitor.runtime.seconds:180')
      expect(html).toContain('monitor.runtime.backupRecoveryPointAge：monitor.runtime.seconds:3600')
    }
  })

  it('合计全部异常类别并对无效时间失败关闭', async () => {
    const html = await renderBackup(
      backup({
        last_success_at: '2026-09-05T01:02:03',
        health: {
          ...baseHealth,
          expired_resources: 3,
          invalid_resources: 4,
          last_restore_completed: '2026-09-05T01:05:03',
          last_restore_succeeded: true,
          missing_resources: 2,
          oldest_capture: '2026-09-05T01:02:03',
        },
      }),
    )

    expect(html).toMatch(
      /backupProblemCount<\/span><strong class="runtime-backup-card__danger"[^>]*>9<\/strong>/u,
    )
    expect(html).toContain('monitor.runtime.backupProblemCountHelp')
    expect(html).toMatch(/backupLastSuccess<\/span><strong[^>]*>—<\/strong>/u)
    expect(html).toContain('monitor.runtime.backupOldestCapture：—')
    expect(html).toContain('monitor.runtime.backupNoRestore')
    expect(html).not.toContain('monitor.runtime.backupRestoreSucceeded')
  })
})
