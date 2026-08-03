/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent
  export default component
}

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_APP_API_ORIGIN?: string
  readonly VITE_APP_PROXY_TARGET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
