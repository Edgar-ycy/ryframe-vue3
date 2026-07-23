import { describe, expect, it } from 'vitest'
import { elementIcons, resolveElementIcon } from './icons'

const mysqlBaselineMenuIcons = [
  'Bell',
  'Coin',
  'Collection',
  'Connection',
  'DataAnalysis',
  'Document',
  'EditPen',
  'Grid',
  'HomeFilled',
  'Lock',
  'MagicStick',
  'Management',
  'Menu',
  'Monitor',
  'Notebook',
  'OfficeBuilding',
  'Operation',
  'Setting',
  'Tools',
  'User',
  'UserFilled',
] as const

describe('menu icon registry', () => {
  it('contains every icon used by the MySQL baseline menus', () => {
    const missingIcons = mysqlBaselineMenuIcons.filter(icon => !(icon in elementIcons))

    expect(missingIcons).toEqual([])
  })

  it('resolves known icons and falls back to Grid for unknown names', () => {
    expect(resolveElementIcon('Bell')).toBe(elementIcons.Bell)
    expect(resolveElementIcon('RemovedLegacyIcon')).toBe(elementIcons.Grid)
    expect(resolveElementIcon(undefined)).toBe(elementIcons.Grid)
  })
})
