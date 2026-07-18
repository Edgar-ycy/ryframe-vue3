import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'

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
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,vue}'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.d.ts',
        'src/api/generated/**',
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        statements: 60,
        branches: 50,
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
      },
    },
  },
})
