

type ThemeMode = 'light' | 'dark'
type ComponentSize = 'large' | 'default' | 'small'

/**
 * 主题管理 Hook
 * 与 settingsStore 解耦，可用于局部组件
 * 
 * @example
 * const { theme, isDark, setTheme, toggleTheme } = useTheme()
 */
export function useTheme(initialTheme: ThemeMode = 'light') {
  const theme = ref<ThemeMode>(initialTheme)
  const isDark = ref(initialTheme === 'dark')

  watchEffect(() => {
    document.documentElement.classList.toggle('dark', isDark.value)
    document.documentElement.setAttribute('data-theme', theme.value)
  })

  function setTheme(mode: ThemeMode) {
    theme.value = mode
    isDark.value = mode === 'dark'
  }

  function toggleTheme() {
    setTheme(isDark.value ? 'light' : 'dark')
  }

  return {
    theme,
    isDark,
    setTheme,
    toggleTheme,
  }
}

/**
 * 组件尺寸管理
 */
export function useComponentSize(initialSize: ComponentSize = 'default') {
  const size = ref<ComponentSize>(initialSize)

  function setSize(s: ComponentSize) {
    size.value = s
  }

  return { size, setSize }
}
