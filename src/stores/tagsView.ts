import { defineStore } from 'pinia'

export interface TagView {
  path: string
  name?: string
  title?: string
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
      if (view.name && !this.cachedViews.includes(view.name)) {
        this.cachedViews.push(view.name)
      }
    },

    removeView(view: TagView) {
      const i = this.visitedViews.findIndex(v => v.path === view.path)
      if (i > -1) this.visitedViews.splice(i, 1)
      if (view.name) {
        const j = this.cachedViews.indexOf(view.name)
        if (j > -1) this.cachedViews.splice(j, 1)
      }
    },

    closeAllViews() {
      this.visitedViews = this.visitedViews.filter(v => v.affix)
      this.cachedViews = []
    },
  },
})
