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
import permission from './directives/permission'
import debounce from './directives/debounce'
import copy from './directives/copy'
import throttle from './directives/throttle'
import watermark from './directives/watermark'
import lazy from './directives/lazy'
import longpress from './directives/longpress'

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

// 显式逐条注册自定义指令：Volar 需直接追踪 app.directive() 调用链才能识别模板中的 v-xxx 指令
// 插件 app.use() 内部的调用链无法被 Volar 静态分析追溯
app.directive('permission', permission)
app.directive('debounce', debounce)
app.directive('copy', copy)
app.directive('throttle', throttle)
app.directive('watermark', watermark)
app.directive('lazy', lazy)
app.directive('longpress', longpress)

app.mount('#app')
