import { beforeEach, describe, expect, it, vi } from 'vitest'

class FakeBroadcastChannel {
  static latest: FakeBroadcastChannel | undefined
  readonly posted: unknown[] = []
  private listener?: (event: MessageEvent) => void

  constructor(readonly name: string) {
    FakeBroadcastChannel.latest = this
  }

  addEventListener(_type: string, listener: (event: MessageEvent) => void): void {
    this.listener = listener
  }

  postMessage(value: unknown): void {
    this.posted.push(value)
  }

  receive(value: unknown): void {
    this.listener?.({ data: value } as MessageEvent)
  }
}

beforeEach(() => {
  vi.resetModules()
  FakeBroadcastChannel.latest = undefined
  vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel)
})

describe('导出任务跨标签事件', () => {
  it('只接收完整 scope 且数量合法的 deleted 事件', async () => {
    const { publishExportJobEvent, subscribeExportJobEvents } =
      await import('@/app/exports/exportJobChannel')
    const received: unknown[] = []
    const unsubscribe = subscribeExportJobEvents((event) => received.push(event))
    const event = {
      type: 'deleted' as const,
      tenantId: 'tenant-a',
      subjectId: 'user-a',
      sessionEpoch: 7,
      jobIds: ['job-1', 'job-2'],
    }

    publishExportJobEvent(event)

    expect(FakeBroadcastChannel.latest?.name).toBe('ryframe-export-jobs-v2')
    expect(FakeBroadcastChannel.latest?.posted).toEqual([event])
    FakeBroadcastChannel.latest?.receive(event)
    FakeBroadcastChannel.latest?.receive({ ...event, jobIds: [] })
    FakeBroadcastChannel.latest?.receive({ ...event, tenantId: undefined })
    FakeBroadcastChannel.latest?.receive({ ...event, subjectId: undefined })
    FakeBroadcastChannel.latest?.receive({ ...event, sessionEpoch: undefined })
    FakeBroadcastChannel.latest?.receive({ ...event, sessionEpoch: 1.5 })
    FakeBroadcastChannel.latest?.receive({
      type: 'deleted',
      tenantId: 'tenant-a',
      userId: 'user-a',
      jobIds: ['job-1'],
    })
    expect(received).toEqual([event])
    unsubscribe()
  })
})
