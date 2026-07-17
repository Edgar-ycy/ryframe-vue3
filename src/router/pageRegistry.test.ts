import { describe, expect, it } from 'vitest'
import { menuPageRegistry, permissionRouteKeys } from './pageRegistry'

describe('page registry contract', () => {
  it('uses unique paths for every registered route key', () => {
    const paths = Object.values(menuPageRegistry).map(entry => entry.path)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('maps every page permission to a registered component', () => {
    for (const routeKey of Object.values(permissionRouteKeys)) {
      expect(menuPageRegistry[routeKey]?.component, routeKey).toBeTypeOf('function')
    }
  })
})
