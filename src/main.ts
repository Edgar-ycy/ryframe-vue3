import { createApp } from 'vue'
import { VueQueryPlugin } from '@tanstack/vue-query'
import App from './App.vue'
import router, {
  ensureAccessibleRoutes,
  refreshAccessibleRoutes,
  resetDynamicRoutes,
  resolveAccessibleRoute,
  installRouterApplicationRuntime,
} from './router'
import pinia from './stores'
import { installGlobalErrorHandlers } from '@/app/errorHandler'
import { installRouteRuntime } from '@/app/navigation/runtime'
import { ensureRuntimeCapabilitiesLoaded } from '@/app/runtime-capabilities/coordinator'
import {
  clearSession,
  initializeSession,
  installSessionCoordinator,
} from '@/app/session/sessionCoordinator'
import { ensureTenantContextLoaded } from '@/app/tenant-context/coordinator'
import { useTenantContextStore } from '@/app/tenant-context/store'
import { installRouteProjection } from '@/features/navigation/routeProjection'
import { getApplicationLocale, i18n, translate } from '@/i18n'
import { configureHttpLocalization } from '@/shared/http/client'
import { elementIcons } from '@/shared/ui/icons'
import directives from './directives'
import { queryClient } from '@/shared/query/client'
import { constantRoutes } from '@/router/routes/constant'
import './styles/index.scss'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'

configureHttpLocalization({
  getLocale: getApplicationLocale,
  translate,
})

const app = createApp(App)

installRouteProjection({ constantRoutes })

for (const [key, component] of Object.entries(elementIcons)) {
  app.component(key, component)
}

app.use(pinia)
app.use(i18n)
app.use(VueQueryPlugin, { queryClient })
installRouterApplicationRuntime({
  clearSession,
  ensureRuntimeCapabilitiesLoaded,
  ensureTenantContextLoaded,
  getTenantContext: useTenantContextStore,
  initializeSession,
})
installGlobalErrorHandlers(app)
installRouteRuntime({
  router,
  ensureAccessibleRoutes,
  refreshAccessibleRoutes,
  resetDynamicRoutes,
  resolveAccessibleRoute,
})
installSessionCoordinator()
app.use(router)
app.use(directives)

app.mount('#app')
