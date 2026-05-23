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

const route = useRoute()
const router = useRouter()
const tagsViewStore = useTagsViewStore()

// 添加标签页（跳过没有 name 的容器路由，如 Layout 根路由 / ）
function addView(r: typeof route) {
  if (!r.name) return
  tagsViewStore.addView({
    path: r.path,
    name: r.name as string,
    title: r.meta?.title as string | undefined,
    affix: (r.meta?.affix as boolean) ?? false,
  })
}

// 使用 router.afterEach 监听路由变更加入标签
router.afterEach((to) => addView(to))

// 初始加载：afterEach 不会在首次进入时触发，手动添加当前路由
addView(route)

function isActive(view) {
  return view.path === route.path
}

function goToView(view) {
  router.push(view.path)
}

function closeView(view) {
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
