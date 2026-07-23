import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useTagsViewStore } from './tagsView'

describe('tags view cache', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('restores an existing affix view to the cache after closeAllViews', () => {
    const store = useTagsViewStore()

    store.addView({ path: '/index', name: 'Index', title: 'Home', affix: true })
    store.addView({ path: '/users', name: 'Users', title: 'Users' })
    store.closeAllViews()

    expect(store.visitedViews.map(view => view.path)).toEqual(['/index'])
    expect(store.cachedViews).toEqual([])

    store.addView({ path: '/index', name: 'Index', title: 'Updated home', affix: true })

    expect(store.visitedViews).toHaveLength(1)
    expect(store.visitedViews[0].title).toBe('Updated home')
    expect(store.cachedViews).toEqual(['Index'])
  })

  it('evicts a component name only after its final visited view is removed', () => {
    const store = useTagsViewStore()

    store.addView({ path: '/reports/current', name: 'Reports' })
    store.addView({ path: '/reports/archive', name: 'Reports' })

    store.removeView({ path: '/reports/current', name: 'Reports' })
    expect(store.cachedViews).toEqual(['Reports'])

    store.removeView({ path: '/reports/archive', name: 'Reports' })
    expect(store.cachedViews).toEqual([])
  })

  it('does not cache routes marked noCache', () => {
    const store = useTagsViewStore()

    store.addView({ path: '/live', name: 'Live', noCache: true })

    expect(store.visitedViews.map(view => view.path)).toEqual(['/live'])
    expect(store.cachedViews).toEqual([])
  })
})
