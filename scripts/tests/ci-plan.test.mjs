import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const cli = fileURLToPath(new URL('../ci-plan.mjs', import.meta.url))
const fullJobs = ['static', 'unit', 'build', 'browser', 'windows-smoke']

function repository(t) {
  const parent = realpathSync(tmpdir())
  const directory = mkdtempSync(join(parent, 'ryframe-ci-plan-'))
  t.after(() => {
    assert.equal(dirname(realpathSync(directory)), parent)
    rmSync(directory, { recursive: true, force: true })
  })

  const cwd = join(directory, 'repo')
  mkdirSync(cwd)
  const git = (...args) =>
    execFileSync('git', ['-c', 'commit.gpgSign=false', '-c', 'core.autocrlf=false', ...args], {
      cwd,
      encoding: 'utf8',
      windowsHide: true,
    }).trim()
  const write = (path, content) => {
    const file = join(cwd, path)
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, content)
  }
  const head = () => git('rev-parse', 'HEAD')
  const commit = () => {
    git('add', '--all')
    git('commit', '--quiet', '-m', 'test change')
    return head()
  }

  git('init', '--quiet', '--initial-branch=main')
  git('config', '--local', 'user.name', 'CI plan fixture')
  git('config', '--local', 'user.email', 'ci-plan@example.invalid')
  write('README.md', 'Old readme\n')
  write('ARCHITECTURE.en.md', 'Old architecture\n')
  write('CHANGELOG.md', 'Old changelog\n')
  write('src/index.ts', 'export const value = 0\n')
  const base = commit()

  function plan(event, payload, sha = head()) {
    const eventPath = join(directory, 'event.json')
    const output = join(directory, 'output.txt')
    writeFileSync(eventPath, typeof payload === 'string' ? payload : JSON.stringify(payload))
    writeFileSync(output, 'existing=retained\n')
    const result = spawnSync(process.execPath, [cli, 'plan'], {
      cwd,
      encoding: 'utf8',
      env: {
        ...process.env,
        GITHUB_EVENT_NAME: event,
        GITHUB_EVENT_PATH: eventPath,
        GITHUB_SHA: sha,
        GITHUB_OUTPUT: output,
      },
    })
    assert.equal(result.status, 0, result.stderr)
    return readFileSync(output, 'utf8')
  }

  const push = (before = base, after = head(), ref = 'refs/heads/main') => ({
    ref,
    before,
    after,
  })

  return { base, commit, git, head, plan, push, write }
}

function expectMode(actual, expected) {
  assert.equal(actual, `existing=retained\nmode=${expected}\n`)
}

test('push 和 PR 以实际检出提交核对纯文档改动', (t) => {
  const repo = repository(t)
  repo.git('switch', '--quiet', '-c', 'topic')
  repo.write('README.md', 'New readme\n')
  repo.write('ARCHITECTURE.en.md', 'New architecture\n')
  repo.write('CHANGELOG.md', 'New changelog\n')
  const topic = repo.commit()
  repo.git('switch', '--quiet', 'main')
  repo.git('merge', '--quiet', '--no-ff', '-m', 'synthetic merge', topic)
  const merge = repo.head()

  expectMode(repo.plan('push', repo.push()), 'docs')
  const payload = { pull_request: { base: { sha: repo.base }, head: { sha: topic } } }
  expectMode(repo.plan('pull_request', payload, merge), 'docs')
  expectMode(repo.plan('pull_request', payload, topic), 'full')
})

test('产品源码、混合、未知 Markdown、CI 与删除均执行完整门禁', (t) => {
  const repo = repository(t)
  for (const [path, contents, mixed] of [
    ['src/index.ts', 'export const value = 1\n', false],
    ['src/index.ts', 'export const value = 2\n', true],
    ['docs/extra.md', 'Unknown documentation\n', false],
    ['openapi/openapi.json', '{}\n', true],
    ['.github/workflows/ci.yml', 'name: CI\n', false],
  ]) {
    const before = repo.head()
    repo.write(path, contents)
    if (mixed) repo.write('README.md', `New readme at ${before}\n`)
    repo.commit()
    expectMode(repo.plan('push', repo.push(before)), 'full')
  }

  const before = repo.head()
  repo.git('rm', '--quiet', 'README.md')
  repo.git('commit', '--quiet', '-m', 'delete readme')
  expectMode(repo.plan('push', repo.push(before)), 'full')
})

test('受认可文档的权限或对象类型变化执行完整门禁', (t) => {
  const repo = repository(t)
  repo.git('update-index', '--chmod=+x', 'README.md')
  repo.git('commit', '--quiet', '-m', 'change mode')
  expectMode(repo.plan('push', repo.push()), 'full')

  const before = repo.head()
  const blob = repo.git('rev-parse', 'HEAD:README.md')
  repo.git('update-index', '--cacheinfo', `120000,${blob},README.md`)
  repo.git('commit', '--quiet', '-m', 'change path type')
  expectMode(repo.plan('push', repo.push(before)), 'full')
})

test('改动文档的命令或代码示例时执行完整门禁', (t) => {
  const repo = repository(t)
  for (const [example, expected] of [
    ['Install with `corepack pnpm install`.\n', 'full'],
    ['Use `corepack pnpm install` once.\n', 'docs'],
    ['Use `corepack pnpm install` once.\n\n```bash\ncat <<EOF\n# output\nEOF\n```\n', 'full'],
    ['Use `corepack pnpm install` once.\n\n```bash\ncat <<EOF\n# updated\nEOF\n```\n', 'full'],
  ]) {
    const before = repo.head()
    repo.write('README.md', example)
    repo.commit()
    expectMode(repo.plan('push', repo.push(before)), expected)
  }
})

test('引用、列表围栏和缩进代码正文有变化时执行完整门禁', (t) => {
  const repo = repository(t)
  const sections = [
    '> 原说明\n>\n> ```bash\n> corepack pnpm check\n> ```\n',
    '- ```bash\n  corepack pnpm check\n  ```\n\n原说明\n',
    '1. > ~~~bash\n   > corepack pnpm check\n   > ~~~\n\n原说明\n',
    '原说明\n\n    corepack pnpm check\n',
    '# 原说明\n    corepack pnpm check\n',
    '原说明\n\n\tcorepack pnpm check\n',
    '原说明\n\n    > corepack pnpm check\n',
    '> 原说明\n>\n>     corepack pnpm check\n',
    '- 原说明\n\n      corepack pnpm check\n',
  ]
  for (const example of sections) {
    repo.write('README.md', example)
    const before = repo.commit()
    const translated = example.replace('原说明', '修改说明')
    repo.write('README.md', translated)
    const after = repo.commit()
    expectMode(repo.plan('push', repo.push(before)), 'docs')

    repo.write('README.md', translated.replace('pnpm check', 'pnpm build'))
    repo.commit()
    expectMode(repo.plan('push', repo.push(after)), 'full')
  }
})

test('引用与缩进的普通说明保留文档模式', (t) => {
  const repo = repository(t)
  const source = '> 原说明\n\n- 列表\n\n    原说明\n\n普通段落\n    原说明\n'
  repo.write('README.md', source)
  const before = repo.commit()
  repo.write('README.md', source.replaceAll('原说明', '修改说明'))
  repo.commit()
  expectMode(repo.plan('push', repo.push(before)), 'docs')
})

test('标签、未知事件、无变更或不可核验的基线执行完整门禁', (t) => {
  const repo = repository(t)
  repo.write('README.md', 'New readme\n')
  const head = repo.commit()
  repo.git('branch', 'unrelated', repo.base)
  repo.git('switch', '--quiet', 'unrelated')
  repo.write('README.md', 'Different history\n')
  const unrelated = repo.commit()
  repo.git('switch', '--quiet', 'main')
  repo.git('tag', '-a', 'tag-object', '-m', 'annotated object', repo.base)
  const tagObject = repo.git('rev-parse', 'refs/tags/tag-object')

  for (const [event, payload, sha] of [
    ['push', repo.push(repo.base, head, 'refs/tags/v1.0.0'), head],
    ['workflow_dispatch', repo.push(), head],
    ['pull_request_target', { pull_request: { base: { sha: repo.base } } }, head],
    ['push', repo.push('0'.repeat(40)), head],
    ['push', repo.push('a'.repeat(40)), head],
    ['push', repo.push('HEAD~1'), head],
    ['push', repo.push(unrelated), head],
    ['push', repo.push(tagObject), head],
    ['push', repo.push(head), head],
    ['push', '{broken', head],
    ['push', repo.push(repo.base, unrelated), head],
  ]) {
    expectMode(repo.plan(event, payload, sha), 'full')
  }
})

function successfulNeeds(mode) {
  return {
    plan: { result: 'success', outputs: { mode } },
    documentation: { result: mode === 'docs' ? 'success' : 'skipped' },
    ...Object.fromEntries(
      fullJobs.map((job) => [job, { result: mode === 'full' ? 'success' : 'skipped' }]),
    ),
  }
}

function required(needs) {
  return spawnSync(process.execPath, [cli, 'required'], {
    encoding: 'utf8',
    env: { ...process.env, RYFRAME_CI_NEEDS: JSON.stringify(needs) },
  })
}

test('Required 接受两个计划中所有必需任务成功', () => {
  for (const mode of ['docs', 'full']) {
    const result = required(successfulNeeds(mode))
    assert.equal(result.status, 0, result.stderr)
  }
  const allRan = successfulNeeds('docs')
  allRan.static.result = 'success'
  assert.equal(required(allRan).status, 0)
})

test('Required 拒绝计划失败、漏传、必需任务漏跑或无效结果', () => {
  for (const mutate of [
    (needs) => {
      needs.plan.result = 'failure'
    },
    (needs) => {
      needs.plan.outputs = {}
    },
    (needs) => {
      needs.plan.outputs.mode = 'unknown'
    },
    (needs) => {
      delete needs.static
    },
    (needs) => {
      delete needs.documentation
    },
    (needs) => {
      needs.browser.result = 'skipped'
    },
    (needs) => {
      needs.unit.result = 'cancelled'
    },
    (needs) => {
      needs.build.result = 'failure'
    },
    (needs) => {
      needs['windows-smoke'].result = 'unknown'
    },
    (needs) => {
      needs.static = {}
    },
    (needs) => {
      needs.documentation.result = 'cancelled'
    },
    (needs) => {
      needs.unexpected = { result: 'success' }
    },
  ]) {
    const needs = successfulNeeds('full')
    mutate(needs)
    const result = required(needs)
    assert.equal(result.status, 1, JSON.stringify(needs))
    assert.notEqual(result.stderr, '')
  }
  const skippedDocs = successfulNeeds('docs')
  skippedDocs.documentation.result = 'skipped'
  assert.equal(required(skippedDocs).status, 1)
  assert.equal(required(null).status, 1)
})
