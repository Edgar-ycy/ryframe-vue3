import { stringify } from 'smol-toml'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import path from 'node:path'

export function buildEnvironment(root) {
  const cli = path.join(root, '.local-tests/pnpm.mjs')
  mkdirSync(path.dirname(cli), { recursive: true })
  writeFileSync(cli, "console.log('11.20.0')\n")
  return {
    ...process.env,
    APP_ENV: 'dev',
    npm_config_user_agent: 'pnpm/11.20.0 npm/? node/? win32 x64',
    npm_execpath: cli,
  }
}

export function fixture(t) {
  const local = path.resolve('.local-tests/node-unit')
  mkdirSync(local, { recursive: true })
  const root = mkdtempSync(path.join(local, 'restore-build-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const git = (...args) => execFileSync('git', ['-C', root, ...args], { windowsHide: true })
  git('init', '--quiet')
  git('config', 'core.autocrlf', 'false')
  writeFileSync(
    path.join(root, '.gitignore'),
    'dist/\n.local-tests/\nnode_modules/\n.env.production\n.env*.local\n',
  )
  writeFileSync(path.join(root, 'app.js'), 'export const answer = 42\n')
  writeFileSync(path.join(root, 'package.json'), '{"packageManager":"pnpm@11.20.0"}\n')
  mkdirSync(path.join(root, 'scripts'), { recursive: true })
  writeFileSync(path.join(root, 'scripts/tool.mjs'), 'export const tool = true\n')
  mkdirSync(path.join(root, 'config'))
  writeFileSync(
    path.join(root, 'config/app.toml'),
    stringify({
      api_origin: '',
      server: { host: 'localhost', port: 5173, proxy_target: 'http://localhost:8080' },
    }) + '\n',
  )
  for (const environment of ['dev', 'test', 'prod']) {
    writeFileSync(path.join(root, `config/app.${environment}.toml`), '# 使用公共默认值\n')
  }
  for (const file of [
    'vite.config.ts',
    'scripts/application-config.mjs',
    'scripts/frontend-tool-config.mjs',
    'scripts/build-identity.mjs',
  ]) {
    writeFileSync(path.join(root, file), 'export const fixture = true\n')
  }
  git('add', '.')
  git(
    '-c',
    'user.name=Test',
    '-c',
    'user.email=test@localhost',
    'commit',
    '--quiet',
    '-m',
    'fixture',
  )
  mkdirSync(path.join(root, 'node_modules/vite'), { recursive: true })
  writeFileSync(path.join(root, 'node_modules/vite/package.json'), '{"version":"7.1.7"}\n')
  mkdirSync(path.join(root, 'dist/.vite'), { recursive: true })
  writeFileSync(path.join(root, 'dist/index.html'), '<script src="/app.js"></script>')
  writeFileSync(path.join(root, 'dist/app.js'), 'console.log(42)')
  writeFileSync(path.join(root, 'dist/.vite/manifest.json'), '{}')
  writeFileSync(
    path.join(root, 'dist/build-identity.json'),
    JSON.stringify({ frontend_commit: 'development' }) + '\n',
  )
  return root
}
