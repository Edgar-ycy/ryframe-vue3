import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import ElementPlus from 'unplugin-element-plus/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_APP_PROXY_TARGET || 'http://localhost:8080'
  const isE2e = process.env.RYFRAME_E2E === '1'

  return {
    plugins: [
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

    optimizeDeps: isE2e
      ? {
          noDiscovery: true,
          include: [
            '@element-plus/icons-vue',
            'axios',
            'element-plus',
            'element-plus/es',
            'element-plus/es/components/*/style/css',
            'pinia',
            'vue',
            'vue-router',
          ],
        }
      : undefined,

    server: {
      port: 80,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },

    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      manifest: true,
      sourcemap: false,
      chunkSizeWarningLimit: 1200,
      rolldownOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules/element-plus')) return 'element-plus'
            if (id.includes('node_modules/vue') || id.includes('node_modules/vue-router') || id.includes('node_modules/pinia')) return 'vue-vendor'
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
