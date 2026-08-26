import type { Component } from 'vue'

export type RouteComponentModule = { default: Component }
export type RouteComponentLoader = () => Promise<RouteComponentModule>
