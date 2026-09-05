import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

const thresholds = {
  statements: 90,
  branches: 85,
}
const coverageGroups = {
  'src/views/monitor/schedules/{cron/**/*.ts,CronScheduleBuilder.vue}': thresholds,
  'src/app/messages/**/*.ts': thresholds,
  '{src/stores/settings.ts,src/stores/settings/**/*.ts,src/app/settings/**/*.ts}': thresholds,
  'src/app/session/**/*.ts': thresholds,
  'src/features/navigation/routeProjection.ts': thresholds,
}

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      reportsDirectory: '.local-tests/coverage/targeted',
      include: Object.keys(coverageGroups),
      thresholds: {
        ...thresholds,
        ...coverageGroups,
      },
    },
  },
})
