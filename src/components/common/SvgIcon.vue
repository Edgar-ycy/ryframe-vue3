<template>
  <svg
    :class="['svg-icon', className]"
    :style="{ width: size + 'px', height: size + 'px', color }"
    aria-hidden="true"
  >
    <use :href="`#icon-${name}`" />
  </svg>
</template>

<script setup lang="ts">
interface Props {
  /** 图标名称（对应 SVG symbols 的 id，如 icon-user） */
  name: string
  /** 尺寸（px） */
  size?: number
  /** 颜色 */
  color?: string
  /** 自定义 class */
  className?: string
}

withDefaults(defineProps<Props>(), {
  size: 16,
})
</script>

<style scoped>
.svg-icon {
  display: inline-block;
  vertical-align: middle;
  fill: currentColor;
  overflow: hidden;
}
</style>
