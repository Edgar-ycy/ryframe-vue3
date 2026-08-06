import type { Component } from 'vue'

type ComponentLoader = () => Promise<Component>

const LAYOUT: ComponentLoader = () => import('@/components/layout/index.vue')
const ROOT_LAYOUT_ROUTE_NAME = 'RootLayout'

export { LAYOUT, ROOT_LAYOUT_ROUTE_NAME }
