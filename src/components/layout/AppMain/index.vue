<template>
  <section class="app-main">
    <router-view v-slot="{ Component }">
      <keep-alive :include="tagsViewStore.cachedViews">
        <component :is="Component" />
      </keep-alive>
    </router-view>
  </section>
</template>

<script setup lang="ts">
import { useTagsViewStore } from '@/stores/tagsView'

const tagsViewStore = useTagsViewStore()
</script>
