import { describe, expect, it } from 'vitest'

import {
  derive,
  json,
  runtimeBackupEvidenceFixture as fixture,
  sha256,
  synchronize,
} from './runtimeBackupEvidenceFixture'

describe('运行时备份恢复证据', () => {
  it('从同一份已核验运行收据和绑定中派生恢复事实', () => {
    const value = fixture()
    const facts = derive(value)

    expect(facts).toEqual({
      backup: {
        capturedAt: '2026-09-05T01:00:00.500Z',
        id: 'backup-one',
        requiredResources: 2,
        sourceScopeId: 'source-scope',
      },
      restore: {
        dataVerifiedAt: '2026-09-05T02:10:00Z',
        faultAt: '2026-09-05T02:00:01Z',
        id: 'restore-one',
        recoveredAt: '2026-09-05T01:00:00.500Z',
        recoveryPointAgeSeconds: 3600,
        startedAt: '2026-09-05T02:01:00Z',
        targetScopeId: 'target-scope',
      },
      runtimeReceiptSha256: sha256(value.runtimeBytes),
    })
  })

  it('拒绝未由外部核验器确认或跨绑定的运行收据', () => {
    const wrongDigest = fixture()
    expect(() => derive(wrongDigest, '0'.repeat(64))).toThrow(/外部核验器/u)

    const wrongScope = fixture()
    wrongScope.runtime.restore.scope_id = 'another-scope'
    wrongScope.runtimeBytes = json(wrongScope.runtime)
    expect(() => derive(wrongScope)).toThrow(/不一致/u)
  })

  it('来源 scope 使用与产品一致的边界且不同于恢复目标', () => {
    for (const replacement of ['a1', `a${'_'.repeat(46)}z`]) {
      const value = fixture()
      value.binding.manifest.scope_id = replacement
      synchronize(value)
      expect(() => derive(value)).not.toThrow()
    }
    for (const replacement of [
      '',
      'a',
      `a${'_'.repeat(47)}z`,
      'Source',
      'source.v2',
      '-source',
      'source-',
      'target-scope',
    ]) {
      const value = fixture()
      value.binding.manifest.scope_id = replacement
      synchronize(value)
      expect(() => derive(value)).toThrow()
    }
    const missingSource = fixture()
    Reflect.deleteProperty(missingSource.binding.manifest, 'scope_id')
    synchronize(missingSource)
    expect(() => derive(missingSource)).toThrow()
  })

  it('拒绝伪造完成、时间错序、重复资源及未知字段', () => {
    const mutations: Array<(value: ReturnType<typeof fixture>) => void> = [
      (value) => {
        value.binding.record.status = 'succeeded'
      },
      (value) => {
        value.binding.record.data_verified_at = '2026-09-05T01:59:00Z'
      },
      (value) => {
        value.binding.manifest.objects.push({ bucket: 'uploads' })
      },
      (value) => {
        Object.assign(value.binding.record, { unknown: true })
      },
      (value) => {
        Object.assign(value.runtime, { unknown: true })
      },
      (value) => {
        value.runtime.backend.sources.full.source.snapshot.clean = false
      },
      (value) => {
        value.runtime.processes.api.receipt_path = 'api.json'
      },
      (value) => {
        Object.assign(value.runtime.backend.artifacts.api, { bytes: '1' })
      },
      (value) => {
        value.runtime.frontend.files[0].path = '../index.html'
      },
      (value) => {
        value.runtime.endpoints.frontend = 'http://localhost:4174'
      },
    ]

    for (const mutate of mutations) {
      const value = fixture()
      mutate(value)
      value.bindingsBytes = json(value.binding)
      value.runtime.digests.bindings = sha256(value.bindingsBytes)
      value.runtimeBytes = json(value.runtime)
      expect(() => derive(value)).toThrow()
    }
  })
})
