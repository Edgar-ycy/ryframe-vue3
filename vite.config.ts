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
        port: 5173,
        host: '0.0.0.0',
        // API 代理：将 /api 请求转发到后端
        proxy: {
            '/api': {
                target: 'http://localhost:8081',
                changeOrigin: true,
            },
        },
    },

    // 构建配置
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: false,
        rolldownOptions: {
            output: {
                manualChunks(id: string) {
                    if (id.includes('node_modules/element-plus')) return 'element-plus'
                    if (id.includes('node_modules/vue') || id.includes('node_modules/vue-router') || id.includes('node_modules/pinia')) return 'vue-vendor'
                },
            },
        },
    },
})
