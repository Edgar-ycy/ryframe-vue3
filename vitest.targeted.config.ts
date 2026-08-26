import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

const cronSources = ['src/views/monitor/schedules/cron/model.ts']
const messageSources = ['src/app/messages/socket/{frameCodec,lifecycle,retryPolicy}.ts']
const settingsSources = ['src/stores/settings/{domAdapter,model,persistence,theme}.ts']
const sessionSources = ['src/app/session/{sessionMessage,state,userProjection}.ts']
const routeProjectionSources = ['src/features/navigation/routeProjection.ts']

const thresholds = {
  statements: 90,
  branches: 85,
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
    include: [
      'tests/unit/cronBuilderModel.test.ts',
      'tests/unit/messageSocket.test.ts',
      'tests/unit/messageSocketCodec.test.ts',
      'tests/unit/routeProjection.test.ts',
      'tests/unit/sessionContext.test.ts',
      'tests/unit/sessionMessage.test.ts',
      'tests/unit/settings.test.ts',
    ],
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      reportsDirectory: '.local-tests/coverage/targeted',
      include: [
        ...cronSources,
        ...messageSources,
        ...settingsSources,
        ...sessionSources,
        ...routeProjectionSources,
      ],
      thresholds: {
        ...thresholds,
        [cronSources[0]]: thresholds,
        [messageSources[0]]: thresholds,
        [settingsSources[0]]: thresholds,
        [sessionSources[0]]: thresholds,
        [routeProjectionSources[0]]: thresholds,
      },
    },
  },
})
