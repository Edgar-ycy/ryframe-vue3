import { createApp } from 'vue'
import { VueQueryPlugin } from '@tanstack/vue-query'
import App from './App.vue'
import router, {
  ensureAccessibleRoutes,
  refreshAccessibleRoutes,
  resetDynamicRoutes,
} from './router'
import pinia from './stores'
import { installGlobalErrorHandlers } from '@/app/errorHandler'
import { installRouteProjection } from '@/app/navigation/routeProjection'
import { installRouteRuntime } from '@/app/navigation/runtime'
import { installSessionCoordinator } from '@/app/session/sessionCoordinator'
import { i18n } from '@/i18n'
import { elementIcons } from '@/shared/ui/icons'
import directives from './directives'
import { queryClient } from '@/shared/query/client'
import { constantRoutes } from '@/router/routes/constant'
import './styles/index.scss'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'

const app = createApp(App)

installRouteProjection({ constantRoutes })

for (const [key, component] of Object.entries(elementIcons)) {
  app.component(key, component)
}

app.use(pinia)
app.use(i18n)
app.use(VueQueryPlugin, { queryClient })
installGlobalErrorHandlers(app)
installRouteRuntime({
  router,
  ensureAccessibleRoutes,
  refreshAccessibleRoutes,
  resetDynamicRoutes,
})
installSessionCoordinator()
app.use(router)
app.use(directives)

app.mount('#app')
