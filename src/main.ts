import { createApp } from 'vue'
import App from './App.vue'
import router, { refreshAccessibleRoutes, resetDynamicRoutes } from './router'
import pinia from './stores'
import { installSessionCoordinator } from '@/app/session/sessionCoordinator'
import { elementIcons } from '@/shared/ui/icons'
import directives from './directives'
import './styles/index.scss'

const app = createApp(App)

for (const [key, component] of Object.entries(elementIcons)) {
  app.component(key, component)
}

app.use(pinia)
installSessionCoordinator({ router, refreshAccessibleRoutes, resetDynamicRoutes })
app.use(router)
app.use(directives)

app.mount('#app')
