export function loadSmokeBrowserConfiguration(root?: string): {
  serverMode: 'dev' | 'preview'
  channel: string | undefined
  attempt: string
}
