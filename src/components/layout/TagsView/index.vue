<template>
  <div class="tags-view-container">
    <div class="tags-view-wrapper">
      <div class="tags-view-scroll">
        <span
          v-for="view in tagsViewStore.visitedViews"
          :key="view.path"
          class="tags-view-item"
          :class="{ active: isActive(view) }"
          @click="goToView(view)"
        >
          {{ view.title || view.name }}
          <el-icon
            v-if="!view.affix"
            :size="10"
            class="el-icon-close"
            @click.stop="closeView(view)"
          >
            <Close />
          </el-icon>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTagsViewStore } from '@/stores/tagsView'
import type { TagView } from '@/stores/tagsView'
import { Close } from '@element-plus/icons-vue'
import { installRouteTagSync } from './routeTagSync'

const route = useRoute()
const router = useRouter()
const tagsViewStore = useTagsViewStore()

const removeRouteTagSync = installRouteTagSync(
  router,
  route,
  view => tagsViewStore.addView(view),
)

onUnmounted(removeRouteTagSync)

function isActive(view: TagView) {
  return view.path === route.path
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
