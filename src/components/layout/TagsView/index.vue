<template>
  <div class="tags-view-container">
    <div class="tags-view-wrapper">
      <div class="tags-view-scroll">
        <div
          v-for="view in tagsViewStore.visitedViews"
          :key="view.path"
          class="tags-view-item"
          :class="{ active: isActive(view) }"
        >
          <button
            type="button"
            class="tags-view-item__link"
            :aria-current="isActive(view) ? 'page' : undefined"
            @click="goToView(view)"
          >
            {{ tagTitle(view) }}
          </button>
          <button
            v-if="!view.affix"
            type="button"
            class="el-icon-close"
            :aria-label="t('shell.tags.close', { title: tagTitle(view) })"
            :title="t('shell.tags.close', { title: tagTitle(view) })"
            @click.stop="closeView(view)"
          >
            <el-icon :size="10"><Close /></el-icon>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTagsViewStore } from '@/stores/tagsView'
import type { TagView } from '@/stores/tagsView'
import { Close } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { translateNavigationTitle } from '@/i18n'
import { installRouteTagSync } from './routeTagSync'

const route = useRoute()
const router = useRouter()
const tagsViewStore = useTagsViewStore()
const { t } = useI18n()

const removeRouteTagSync = installRouteTagSync(router, route, (view) => tagsViewStore.addView(view))

onUnmounted(removeRouteTagSync)

function isActive(view: TagView) {
  return view.path === route.path
}

function tagTitle(view: TagView): string {
  return translateNavigationTitle(view.title) || view.name || view.path
}

function goToView(view: TagView) {
  router.push(view.path)
}

function closeView(view: TagView) {
  tagsViewStore.removeView(view)
  // 如果关闭的是当前标签，跳转到上一个
  if (isActive(view)) {
    const views = tagsViewStore.visitedViews
    const lastView = views[views.length - 1]
    if (lastView) {
      router.push(lastView.path)
    }
  }
}
</script>
