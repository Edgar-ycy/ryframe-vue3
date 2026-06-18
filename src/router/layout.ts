import type { Component } from 'vue'

type ComponentLoader = () => Promise<Component>

const LAYOUT: ComponentLoader = () => import('@/components/layout/index.vue')

export { LAYOUT }
