import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
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
      include: [
        'src/router/menuRouteBuilder.ts',
        'src/router/navigationGuard.ts',
        'src/router/runtimeRouteRegistry.ts',
        'src/shared/security/passwordPolicy.ts',
        'src/utils/confirmAction.ts',
        'src/utils/permission.ts',
        'src/views/dashboardLinks.ts',
        'src/views/login/loginState.ts',
        'src/views/system/menu/menuTree.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 70,
      },
    },
  },
})
