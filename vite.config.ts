import { defineConfig, loadEnv, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import ElementPlus from 'unplugin-element-plus/vite'

const vueCompositionPrimitives = [
  'computed',
  'customRef',
  'effectScope',
  'getCurrentInstance',
  'getCurrentScope',
  'getCurrentWatcher',
  'inject',
  'isProxy',
  'isReactive',
  'isReadonly',
  'isRef',
  'isShallow',
  'markRaw',
  'nextTick',
  'onActivated',
  'onBeforeMount',
  'onBeforeUnmount',
  'onBeforeUpdate',
  'onDeactivated',
  'onErrorCaptured',
  'onMounted',
  'onRenderTracked',
  'onRenderTriggered',
  'onScopeDispose',
  'onServerPrefetch',
  'onUnmounted',
  'onUpdated',
  'onWatcherCleanup',
  'provide',
  'reactive',
  'readonly',
  'ref',
  'shallowReactive',
  'shallowReadonly',
  'shallowRef',
  'toRaw',
  'toRef',
  'toRefs',
  'toValue',
  'triggerRef',
  'unref',
  'useAttrs',
  'useCssModule',
  'useCssVars',
  'useId',
  'useModel',
  'useSlots',
  'useTemplateRef',
  'watch',
  'watchEffect',
  'watchPostEffect',
  'watchSyncEffect',
]

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

function normalizedModuleId(id: string): string {
  return id.replaceAll('\\', '/')
}

function isI18nCoreModule(id: string): boolean {
  const normalizedId = normalizedModuleId(id)
  return (
    normalizedId.endsWith('/src/i18n/messages.ts') ||
    normalizedId.endsWith('/src/i18n/catalog/core.ts') ||
    normalizedId.includes('/src/i18n/catalog/core/') ||
    normalizedId.endsWith('/src/i18n/catalog/shell.ts') ||
    normalizedId.endsWith('/src/i18n/catalog/export-jobs.ts')
  )
}

function operationChunkName(id: string): string | null {
  const operation = normalizedModuleId(id).match(
    /\/src\/api\/generated\/operations\/(core|system|platform|monitor|agent)\.ts$/,
  )
  return operation ? `api-${operation[1]}` : null
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
        imports: [{ vue: vueCompositionPrimitives }],
        dts: 'src/auto-imports.d.ts',
      }),
      Components({
        resolvers: [ElementPlusResolver()],
        dts: 'src/components.d.ts',
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
          codeSplitting: {
            groups: [
              {
                name: 'api-runtime',
                test: (id) => normalizedModuleId(id).endsWith('/src/api/operationRequest.ts'),
                priority: 100,
              },
              {
                name: operationChunkName,
                test: (id) => operationChunkName(id) !== null,
                priority: 90,
                includeDependenciesRecursively: false,
              },
              { name: 'i18n-core', test: isI18nCoreModule, priority: 80 },
              {
                name: 'zrender-vendor',
                test: (id) => normalizedModuleId(id).includes('/node_modules/zrender/'),
                priority: 70,
              },
              {
                name: 'echarts-charts',
                test: (id) => normalizedModuleId(id).includes('/node_modules/echarts/chart/'),
                priority: 60,
              },
              {
                name: 'echarts-components',
                test: (id) => normalizedModuleId(id).includes('/node_modules/echarts/component/'),
                priority: 60,
              },
              {
                name: 'echarts-renderer',
                test: (id) => normalizedModuleId(id).includes('/node_modules/echarts/renderer/'),
                priority: 60,
              },
              {
                name: 'vue-vendor',
                test: (id) => {
                  const normalizedId = normalizedModuleId(id)
                  return (
                    normalizedId.includes('/node_modules/vue/') ||
                    normalizedId.includes('/node_modules/vue-router/') ||
                    normalizedId.includes('/node_modules/pinia/')
                  )
                },
                priority: 50,
              },
              {
                name: 'echarts-core',
                test: (id) => normalizedModuleId(id).includes('/node_modules/echarts/'),
                priority: 50,
              },
              {
                name: 'app-runtime',
                test: /[\\/]src[\\/]/,
                tags: ['$initial'],
                priority: 10,
                includeDependenciesRecursively: false,
              },
            ],
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
