import { createApp } from 'vue'
import App from './App.vue'

// 路由
import router from './router'

// 状态管理
import pinia from './stores'

// UI 组件库
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

// Element Plus 图标（全局注册，无需手动 import）
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

// 自定义指令
import directives from './directives'

// 全局样式
import './styles/index.scss'

const app = createApp(App)

// 注册所有 Element Plus 图标为全局组件
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(router)
app.use(pinia)
app.use(ElementPlus, { locale: zhCn })
app.use(directives)

app.mount('#app')
