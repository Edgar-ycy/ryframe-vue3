import assert from 'node:assert/strict'
import test from 'node:test'

import {
  findPrereleaseVersions,
  findPrereleaseVersionsInCiYaml,
  findPrereleaseVersionsInPackageJson,
  findPrereleaseVersionsInPnpmLock,
  findPrereleaseVersionsInPnpmWorkspace,
} from './prerelease-dependency-policy.mjs'

test('detects registry, v-prefixed, arbitrary-label, and numeric prereleases', () => {
  assert.deepEqual(
    findPrereleaseVersions(
      'pkg@1.2.3-rc.1 #V2.0.0-beta.2 3.0.0-next.4 4.0.0-dev.1 '
      + '5.0.0-experimental.20260723 6.0.0-0',
    ),
    [
      '1.2.3-rc.1',
      'V2.0.0-beta.2',
      '3.0.0-next.4',
      '4.0.0-dev.1',
      '5.0.0-experimental.20260723',
      '6.0.0-0',
    ],
  )
})

test('does not treat stable versions or embedded text as prereleases', () => {
  assert.deepEqual(
    findPrereleaseVersions('pkg@1.2.3 pkg@2.0.0+build.4 save1.2.3-rc.1'),
    [],
  )
})

test('parses package.json before inspecting escaped dependency versions', () => {
  const source = String.raw`{
    "dependencies": {
      "escaped-rc": "1.2.3-r\u0063.1",
      "escaped-next": "2.0.0-n\u0065xt.2"
    }
  }`

  assert.deepEqual(
    findPrereleaseVersions(source),
    [],
    'the raw-text fallback must not be relied on for escaped JSON',
  )
  assert.deepEqual(
    findPrereleaseVersionsInPackageJson(source),
    ['1.2.3-rc.1', '2.0.0-next.2'],
  )
})

test('parses pnpm YAML before inspecting escaped keys and values', () => {
  const source = String.raw`
packages:
  "escaped@3.0.0-d\u0065v.3": {}
importers:
  .:
    dependencies:
      escaped:
        specifier: "3.0.0-\u0030"
        version: "3.0.0-\u0030"
`

  assert.deepEqual(
    findPrereleaseVersions(source),
    [],
    'the raw-text fallback must not be relied on for escaped YAML',
  )
  assert.deepEqual(
    findPrereleaseVersionsInPnpmLock(source).sort(),
    ['3.0.0-dev.3', '3.0.0-0', '3.0.0-0'].sort(),
  )
})

test('does not treat peer dependency ranges as locked prerelease packages', () => {
  const source = `
packages:
  stable-package@1.2.3:
    peerDependencies:
      preview-peer: ^3.0.0-0
snapshots:
  stable-package@1.2.3:
    peerDependencies:
      preview-peer: ^3.0.0-0
`

  assert.deepEqual(findPrereleaseVersionsInPnpmLock(source), [])
})

test('rejects prerelease workspace overrides without flagging stable overrides', () => {
  const prereleaseSource = String.raw`
overrides:
  preview-package: "3.0.0-r\u0063.1"
  stable-package: 4.2.1
`
  const stableSource = `
overrides:
  stable-package: 4.2.1
  aliased-package: npm:replacement-package@5.0.0
`

  assert.deepEqual(
    findPrereleaseVersionsInPnpmWorkspace(prereleaseSource),
    ['3.0.0-rc.1'],
  )
  assert.deepEqual(findPrereleaseVersionsInPnpmWorkspace(stableSource), [])
})

test('parses workflow YAML and checks action, docker, and container references', () => {
  const source = String.raw`
jobs:
  test:
    container: "node:22.0.0-r\u0063.1"
    services:
      database:
        image: "postgres:17.0.0-d\u0065v.2"
    steps:
      - "u\u0073es": "vendor/action@v1.2.3-n\u0065xt.4"
      - uses: "docker://vendor/tool:3.0.0-\u0030"
      - run: echo "ignored 9.9.9-r\u0063.1"
`

  assert.deepEqual(
    findPrereleaseVersions(source),
    [],
    'the raw-text fallback must not be relied on for escaped workflow YAML',
  )
  assert.deepEqual(
    findPrereleaseVersionsInCiYaml(source),
    ['22.0.0-rc.1', '17.0.0-dev.2', 'v1.2.3-next.4', '3.0.0-0'],
  )
})

test('checks composite and Docker action manifests without flagging stable references', () => {
  const source = String.raw`
runs:
  using: composite
  image: "docker://vendor/runtime:4.0.0-experim\u0065ntal.5"
  steps:
    - uses: vendor/stable-action@v5.2.0
    - uses: "vendor/preview-action@V6.1.0-b\u0065ta.3"
env:
  DOCUMENTATION_EXAMPLE: 8.0.0-rc.1
`

  assert.deepEqual(
    findPrereleaseVersionsInCiYaml(source),
    ['4.0.0-experimental.5', 'V6.1.0-beta.3'],
  )
})
