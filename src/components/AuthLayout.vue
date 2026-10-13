<template>
  <main class="auth-layout">
    <section class="auth-brand" :aria-label="brand">
      <div class="auth-brand__mark" aria-hidden="true">R</div>
      <h1>{{ brand }}</h1>
      <p>{{ description }}</p>
      <div class="auth-brand__decoration" aria-hidden="true"></div>
    </section>
    <section class="auth-content">
      <div class="auth-panel"><slot /></div>
    </section>
  </main>
</template>

<script setup lang="ts">
defineProps<{ brand: string; description: string }>()
</script>

<style scoped>
.auth-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(420px, 1fr);
  min-height: 100dvh;
  background: var(--el-bg-color-page);
}

.auth-brand {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
  padding: clamp(40px, 7vw, 112px);
  color: #fff;
  background: linear-gradient(145deg, #17314e, #24365b 55%, #334a79);
}

.auth-brand__mark {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  margin-bottom: 28px;
  border: 1px solid rgb(255 255 255 / 35%);
  border-radius: 18px;
  font-size: 32px;
  font-weight: 700;
}

h1 {
  position: relative;
  z-index: 1;
  margin: 0 0 20px;
  font-size: clamp(30px, 3vw, 48px);
  line-height: 1.25;
}

p {
  position: relative;
  z-index: 1;
  max-width: 420px;
  margin: 0;
  color: #e0e7f3;
  font-size: 17px;
  line-height: 1.8;
}

.auth-brand__decoration {
  position: absolute;
  right: -160px;
  bottom: -200px;
  width: 480px;
  height: 480px;
  border: 1px solid rgb(255 255 255 / 15%);
  border-radius: 50%;
  box-shadow:
    0 0 0 70px rgb(255 255 255 / 4%),
    0 0 0 140px rgb(255 255 255 / 3%);
}

.auth-content {
  display: grid;
  place-items: center;
  padding: 48px 28px;
}

.auth-panel {
  width: min(100%, 420px);
  padding: 36px 32px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 16px;
  background: var(--el-bg-color);
  color: var(--el-text-color-primary);
  box-shadow: 0 16px 48px rgb(0 0 0 / 6%);
}

@media (width <= 860px) {
  .auth-layout {
    grid-template-columns: 1fr;
  }

  .auth-brand {
    padding: 32px 28px;
  }

  .auth-brand__mark,
  .auth-brand__decoration {
    display: none;
  }

  h1 {
    margin-bottom: 12px;
    font-size: 28px;
  }

  p {
    font-size: 15px;
  }

  .auth-content {
    align-items: start;
    padding: 28px 16px;
  }

  .auth-panel {
    padding: 28px 20px;
  }
}
</style>
