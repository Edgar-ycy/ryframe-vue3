import { defineStore } from 'pinia'

export interface TagView {
  path: string
  name?: string
  title?: string
  affix?: boolean
  noCache?: boolean
  requiredCapabilities?: readonly string[]
}

interface TagsViewState {
  visitedViews: TagView[]
  cachedViews: string[]
}

function getCachedViewNames(views: readonly TagView[]): string[] {
  return [
    ...new Set(
      views.filter((view) => view.name && !view.noCache).map((view) => view.name as string),
    ),
  ]
}

export const useTagsViewStore = defineStore('tagsView', {
  state: (): TagsViewState => ({
    visitedViews: [],
    cachedViews: [],
  }),

  actions: {
    addView(view: TagView) {
      const existing = this.visitedViews.find((item) => item.path === view.path)
      if (existing) {
        Object.assign(existing, view)
      } else {
        this.visitedViews.push({ ...view })
      }
      this.cachedViews = getCachedViewNames(this.visitedViews)
    },

    removeView(view: TagView) {
      const i = this.visitedViews.findIndex((v) => v.path === view.path)
      if (i > -1) this.visitedViews.splice(i, 1)
      this.cachedViews = getCachedViewNames(this.visitedViews)
    },

    closeAllViews() {
      this.visitedViews = this.visitedViews.filter((v) => v.affix)
      this.cachedViews = []
    },
  },
})
