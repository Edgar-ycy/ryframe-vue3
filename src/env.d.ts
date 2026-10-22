/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent
  export default component
}

declare const __RYFRAME_PUBLIC_CONFIG__: Readonly<{ apiOrigin: string }>
