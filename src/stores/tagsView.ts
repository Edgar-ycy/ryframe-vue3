import { defineStore } from 'pinia'
import type { RouteLocationNormalized } from 'vue-router'

interface TagView {
  path: string
  name?: string | symbol
  title?: string | symbol
  affix?: boolean
}

interface TagsViewState {
  visitedViews: TagView[]
  cachedViews: string[]
}

export const useTagsViewStore = defineStore('tagsView', {
  state: (): TagsViewState => ({
    visitedViews: [],
    cachedViews: [],
  }),

  actions: {
    addView(view: TagView) {
      if (this.visitedViews.some(v => v.path === view.path)) return
      this.visitedViews.push(view)
      if (view.name && !this.cachedViews.includes(view.name as string)) {
        this.cachedViews.push(view.name as string)
      }
    },

    removeView(view: TagView) {
      const i = this.visitedViews.findIndex(v => v.path === view.path)
      if (i > -1) this.visitedViews.splice(i, 1)
      const j = this.cachedViews.indexOf(view.name as string)
      if (j > -1) this.cachedViews.splice(j, 1)
    },

    closeOtherViews(view: TagView) {
      this.visitedViews = this.visitedViews.filter(
        v => v.path === view.path || v.affix,
      )
    },

    closeAllViews() {
      this.visitedViews = this.visitedViews.filter(v => v.affix)
      this.cachedViews = []
    },
  },
})
