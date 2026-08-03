import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import coverageScope from './scripts/coverage-scope.json'

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      imports: [
        'vue',
        'vue-router',
        'pinia',
        {
          'element-plus': ['ElMessage', 'ElMessageBox', 'ElNotification', 'ElLoading'],
        },
      ],
      dts: false,
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    // Windows 下 forks 与 V8 coverage 并发时可能丢失 Worker，线程池可稳定保留并行执行。
    pool: 'threads',
    environment: 'node',
    include: ['src/**/*.test.ts'],
    testTimeout: 15_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // 只统计具备稳定单测边界的核心逻辑；清单完整性由架构守卫负责。
      include: coverageScope.files,
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.d.ts',
        'src/api/generated/**',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        statements: 70,
        branches: 60,
        'src/app/session/sessionCoordinator.ts': {
          lines: 90,
          functions: 90,
          statements: 90,
          branches: 80,
        },
        'src/api/modules/auth.ts': {
          lines: 90,
          functions: 90,
          statements: 90,
          branches: 80,
        },
        'src/shared/http/client.ts': {
          lines: 90,
          functions: 90,
          statements: 90,
          branches: 80,
        },
        'src/stores/user.ts': {
          lines: 90,
          functions: 90,
          statements: 90,
          branches: 80,
        },
        'src/utils/auth.ts': {
          lines: 90,
          functions: 90,
          statements: 90,
          branches: 80,
        },
        'src/utils/permission.ts': {
          lines: 90,
          functions: 90,
          statements: 90,
          branches: 80,
        },
        'src/app/messages/messageSocket.ts': {
          lines: 90,
          functions: 90,
          statements: 90,
          branches: 80,
        },
        'src/app/messages/messageQueries.ts': {
          lines: 90,
          functions: 90,
          statements: 90,
          branches: 80,
        },
      },
    },
  },
})
