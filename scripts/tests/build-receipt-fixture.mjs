import path from 'node:path'

import { canonicalDigest } from '../build-source-inventory.mjs'

const emptyGroup = () => ({ sha256: canonicalDigest([]), files: [] })

function inventory(head) {
  return {
    source: {
      snapshot: { head, patch_sha256: 'd'.repeat(64), files: [], clean: true },
      worktree_fingerprint: `sha256:${'1'.repeat(64)}`,
    },
    files: [],
    guard: { head, index_sha256: '2'.repeat(64), modes_sha256: '3'.repeat(64) },
  }
}

function backendCommand(role) {
  const [feature, name] = role === 'api' ? ['bin-api', 'ryframe'] : ['bin-worker', 'ryframe-worker']
  return [
    'cargo',
    'build',
    '--locked',
    '-p',
    'ryframe',
    '--no-default-features',
    '--features',
    feature,
    '--bin',
    name,
    '--message-format=json',
  ]
}

export function backendBuild(head, artifact) {
  return {
    format_version: 2,
    kind: 'restore-backend-build',
    sources: {
      product: { api: emptyGroup(), worker: emptyGroup() },
      tools: emptyGroup(),
      full: inventory(head),
    },
    build: {
      commands: { api: backendCommand('api'), worker: backendCommand('worker') },
      profile: 'dev',
      target: 'x86_64-pc-windows-msvc',
      jobs: 'cargo-default',
      toolchain: { cargo: 'cargo 1.91.0', rustc: 'rustc 1.91.0\nhost: x86_64-pc-windows-msvc' },
      environment: { variables: [], sha256: canonicalDigest([]) },
    },
    artifacts: {
      api: artifact('api', '3'.repeat(64)),
      worker: artifact('worker', '4'.repeat(64)),
    },
  }
}

export function frontendBuild(head, files) {
  return {
    format_version: 2,
    kind: 'restore-frontend-build',
    sources: {
      product: { frontend: emptyGroup() },
      tools: emptyGroup(),
      full: inventory(head),
    },
    build: {
      command: ['vite', 'build'],
      mode: 'production',
      target: 'vite-default',
      toolchain: {
        node: 'v24.0.0',
        pnpm: { pinned: '11.20.0', observed: '11.20.0' },
        vite: '7.1.7',
      },
      environment: { variables: [], sha256: canonicalDigest([]) },
      environment_files: [],
    },
    files,
  }
}

export function artifactFactory(directory = process.cwd()) {
  return (role, digest) => ({
    executable: path.resolve(directory, `${role}.exe`),
    command: backendCommand(role),
    bytes: 1,
    sha256: digest,
  })
}
