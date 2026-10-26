import { defineConfig } from '@playwright/test'
import base, { environment } from './playwright.real.config'

if (environment.fixture !== 'core' || environment.restore !== undefined)
  throw new Error('生成页面验收仅接受无 restore 的 core 配置')

export default defineConfig({ ...base, testDir: 'tests/browser-generated' })
