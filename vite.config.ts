import { defineConfig, loadEnv, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import ElementPlus from 'unplugin-element-plus/vite'

function normalizeBuildCommit(value: string | undefined): string {
  const commit = value?.trim().toLowerCase()
  if (!commit) return 'development'
  if (!/^[0-9a-f]{40}$/.test(commit)) {
    throw new Error('VITE_APP_BUILD_COMMIT must be a full 40-character Git commit SHA')
  }
  return commit
}

function normalizeDevServerPort(value: string | undefined): number {
  const port = Number(value?.trim() || '5173')
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('VITE_APP_DEV_PORT must be an integer between 1 and 65535')
  }
  return port
}

function buildIdentityPlugin(frontendCommit: string): Plugin {
  return {
    name: 'ryframe-build-identity',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'build-identity.json',
        source: `${JSON.stringify({ frontend_commit: frontendCommit }, null, 2)}\n`,
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_APP_PROXY_TARGET || 'http://localhost:8080'
  const frontendCommit = normalizeBuildCommit(env.VITE_APP_BUILD_COMMIT)
  const devServerPort = normalizeDevServerPort(env.VITE_APP_DEV_PORT)

  return {
    plugins: [
      buildIdentityPlugin(frontendCommit),
      vue(),
      AutoImport({
        imports: [
          'vue',
          'vue-router',
          'pinia',
          {
            'element-plus': [
              'ElMessage',
              'ElMessageBox',
              'ElNotification',
              'ElLoading',
            ],
          },
          {
            from: 'element-plus',
            imports: ['FormInstance', 'FormRules'],
            type: true,
          },
        ],
        dts: 'src/auto-imports.d.ts',
      }),
      Components({
        resolvers: [ElementPlusResolver()],
        dts: false,
      }),
      ElementPlus({}),
    ],

    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },

    optimizeDeps: {
      include: [
        '@element-plus/icons-vue',
        '@tanstack/vue-query',
        'axios',
        'dompurify',
        'echarts/charts',
        'echarts/components',
        'echarts/core',
        'echarts/renderers',
        'element-plus',
        'element-plus/es',
        'element-plus/es/locale/lang/en',
        'element-plus/es/locale/lang/zh-cn',
        'markdown-it',
        'pinia',
        'vue',
        'vue-i18n',
        'vue-router',
      ],
      noDiscovery: true,
    },

    server: {
      port: devServerPort,
      host: env.VITE_APP_DEV_HOST || '127.0.0.1',
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          ws: true,
        },
      },
    },

    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      manifest: true,
      sourcemap: false,
      chunkSizeWarningLimit: 500,
      rolldownOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules/vue') || id.includes('node_modules/vue-router') || id.includes('node_modules/pinia')) return 'vue-vendor'
            if (id.includes('node_modules/zrender')) return 'zrender-vendor'
            if (id.includes('node_modules/echarts')) {
              if (id.includes('/chart/')) return 'echarts-charts'
              if (id.includes('/component/')) return 'echarts-components'
              if (id.includes('/renderer/')) return 'echarts-renderer'
              return 'echarts-core'
            }
          },
        },
        onLog(level, log, defaultHandler) {
          const isVueUsePureAnnotation =
            log.code === 'INVALID_ANNOTATION' && log.id?.includes('@vueuse/core')

          if (isVueUsePureAnnotation) return

          defaultHandler(level === 'warn' ? 'error' : level, log)
        },
      },
    },
  }
})
