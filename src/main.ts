import { createApp } from 'vue'
import { VueQueryPlugin } from '@tanstack/vue-query'
import App from './App.vue'
import router, { ensureAccessibleRoutes, resetDynamicRoutes } from './router'
import pinia from './stores'
import { installGlobalErrorHandlers } from '@/app/errorHandler'
import { installSessionCoordinator } from '@/app/session/sessionCoordinator'
import { i18n } from '@/i18n'
import { elementIcons } from '@/shared/ui/icons'
import directives from './directives'
import { queryClient } from '@/shared/query/client'
import './styles/index.scss'

const app = createApp(App)

for (const [key, component] of Object.entries(elementIcons)) {
  app.component(key, component)
}

app.use(pinia)
app.use(i18n)
app.use(VueQueryPlugin, { queryClient })
installGlobalErrorHandlers(app)
installSessionCoordinator({ router, ensureAccessibleRoutes, resetDynamicRoutes })
app.use(router)
app.use(directives)

app.mount('#app')
