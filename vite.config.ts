import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import {resolve} from 'path'
import AutoImport from 'unplugin-auto-import/vite'

// https://vite.dev/config/
export default defineConfig({
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
    ],

    // 路径别名
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        },
    },

    // 开发服务器
    server: {
        port: 80,
        host: '0.0.0.0',
        // API 代理：将 /api 请求转发到后端
        proxy: {
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            },
        },
    },

    // 构建配置
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: false,
        // Element Plus 整体较大，调高警告阈值
        chunkSizeWarningLimit: 1200,
        rolldownOptions: {
            output: {
                manualChunks(id: string) {
                    if (id.includes('node_modules/element-plus')) return 'element-plus'
                    if (id.includes('node_modules/vue') || id.includes('node_modules/vue-router') || id.includes('node_modules/pinia')) return 'vue-vendor'
                },
            },
            // 抑制 @vueuse/core 第三方包的 PURE 注释位置警告
            onLog(level, log) {
                if (log.code === 'INVALID_ANNOTATION') return
            },
        },
    },
})
