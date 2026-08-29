<template>
  <el-dialog v-model="visible" :title="title" width="600px" @close="emit('close')">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
      <el-form-item :label="t('system.notice.title')" prop="title">
        <el-input
          :model-value="form.title"
          :placeholder="t('system.notice.enterNoticeTitle')"
          @update:model-value="updateField('title', $event)"
        />
      </el-form-item>
      <el-form-item :label="t('system.notice.typePlaceholder')">
        <el-select
          :model-value="form.notice_type"
          style="width: 100%"
          @update:model-value="updateField('notice_type', $event)"
        >
          <el-option :label="t('system.notice.notice')" value="notice" />
          <el-option :label="t('system.notice.announcement')" value="announcement" />
        </el-select>
      </el-form-item>
      <el-form-item :label="t('system.common.content')" prop="content_markdown">
        <div class="markdown-editor">
          <el-input
            :model-value="form.content_markdown"
            class="markdown-editor__input"
            type="textarea"
            :rows="10"
            :placeholder="t('system.notice.markdownPlaceholder')"
            @update:model-value="updateField('content_markdown', $event)"
          />
          <section
            class="markdown-editor__preview"
            :aria-label="t('system.notice.markdownPreview')"
          >
            <p v-if="!form.content_markdown" class="markdown-editor__empty">
              {{ t('system.notice.previewEmpty') }}
            </p>
            <!-- 仅允许绑定由 renderMarkdown 禁用原始 HTML 并经 DOMPurify 清洗后的受限内容。 -->
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div v-else class="markdown-editor__content" v-html="renderedContent" />
          </section>
        </div>
      </el-form-item>
      <el-form-item v-if="isEdit" :label="t('system.common.status')">
        <el-radio-group
          :model-value="form.status"
          @update:model-value="updateField('status', $event)"
        >
          <el-radio value="1">{{ t('system.notice.published') }}</el-radio>
          <el-radio value="0">{{ t('system.notice.draft') }}</el-radio>
          <el-radio value="2">{{ t('system.notice.closed') }}</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">{{ t('system.common.cancel') }}</el-button>
      <el-button
        v-if="isEdit"
        v-perm="'system:notice:edit'"
        type="primary"
        :loading="submitLoading"
        @click="emit('submit')"
        >{{ t('system.common.confirm') }}</el-button
      >
      <el-button
        v-else
        v-perm="'system:notice:add'"
        type="primary"
        :loading="submitLoading"
        @click="emit('submit')"
        >{{ t('system.common.confirm') }}</el-button
      >
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { FormInstance, FormRules } from 'element-plus'
import type { NoticeForm } from './noticeFormModel'

const props = defineProps<{
  form: NoticeForm
  title: string
  isEdit: boolean
  rules: FormRules
  renderedContent: string
  submitLoading: boolean
}>()

const emit = defineEmits<{
  'update:form': [value: NoticeForm]
  close: []
  submit: []
  'form-ready': [form: FormInstance | undefined]
}>()

const { t } = useI18n()
const visible = defineModel<boolean>('visible', { required: true })
const formRef = ref<FormInstance>()

watch(formRef, (instance) => emit('form-ready', instance))
onBeforeUnmount(() => emit('form-ready', undefined))

function updateField(key: keyof NoticeForm, value: unknown): void {
  if (typeof value === 'string') emit('update:form', { ...props.form, [key]: value })
}
</script>

<style scoped>
.markdown-editor {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
  width: 100%;
}

.markdown-editor__preview {
  min-height: 232px;
  overflow: auto;
  padding: 10px 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  background: var(--el-fill-color-lighter);
  color: var(--el-text-color-regular);
}

.markdown-editor__empty {
  margin: 0;
  color: var(--el-text-color-placeholder);
}

.markdown-editor__content :deep(pre) {
  overflow: auto;
  padding: 10px;
  border-radius: 4px;
  background: var(--el-fill-color-dark);
}

@media (width <= 720px) {
  .markdown-editor {
    grid-template-columns: 1fr;
  }
}
</style>
