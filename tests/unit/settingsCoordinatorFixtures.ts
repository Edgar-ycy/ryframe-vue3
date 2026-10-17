import { vi } from 'vitest'

export function installSettingsEnvironment(storedSettings?: string) {
  const values = new Map<string, string>()
  if (storedSettings !== undefined) values.set('ryframe_settings', storedSettings)
  const properties = new Map<string, string>()
  const attributes = new Map<string, string>()
  const classToggle = vi.fn()
  const classContains = vi.fn(() => false)
  const getItem = vi.fn((key: string) => values.get(key) ?? null)
  const setItem = vi.fn((key: string, value: string) => values.set(key, value))
  const setAttribute = vi.fn((key: string, value: string) => attributes.set(key, value))
  const setProperty = vi.fn((key: string, value: string) => properties.set(key, value))
  const setLang = vi.fn((value: string) => attributes.set('lang', value))

  vi.stubGlobal('localStorage', { getItem, setItem })
  vi.stubGlobal('document', {
    documentElement: {
      classList: { contains: classContains, toggle: classToggle },
      get lang() {
        return attributes.get('lang') ?? ''
      },
      set lang(value: string) {
        setLang(value)
      },
      setAttribute,
      style: { getPropertyValue: (key: string) => properties.get(key) ?? '', setProperty },
    },
  })

  const writes = [classToggle, setAttribute, setProperty, setLang, setItem]
  return { attributes, classContains, classToggle, getItem, properties, setItem, values, writes }
}

export function settingsWriteCount(setItem: ReturnType<typeof vi.fn>): number {
  return setItem.mock.calls.filter(([key]) => key === 'ryframe_settings').length
}
