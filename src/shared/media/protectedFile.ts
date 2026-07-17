export interface ProtectedFileLocation {
  path: string
  bucket?: string
}

const protectedDownloadPath = '/common/file/download'
const fallbackOrigin = 'http://ryframe.local'

/** Parse the stable download locator returned for objects in private buckets. */
export function parseProtectedFileUrl(value: string | null | undefined): ProtectedFileLocation | null {
  const candidate = value?.trim()
  if (!candidate) return null

  let url: URL
  try {
    url = new URL(candidate, fallbackOrigin)
  }
  catch {
    return null
  }

  if (!url.pathname.endsWith(protectedDownloadPath)) return null

  const path = url.searchParams.get('path')?.trim()
  if (!path) return null

  const bucket = url.searchParams.get('bucket')?.trim()
  return bucket ? { path, bucket } : { path }
}
