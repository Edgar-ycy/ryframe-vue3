<template>
  <el-dialog v-model="dialogVisible" :title="title" width="600px" @close="emit('close')">
    <el-form ref="formRef" :model="editorForm" :rules="rules" label-width="80px">
      <el-form-item :label="t('system.notice.title')" prop="title">
        <el-input v-model="titleInput" :placeholder="t('system.notice.enterNoticeTitle')" />
      </el-form-item>
      <el-form-item :label="t('system.notice.typePlaceholder')">
        <el-select v-model="noticeTypeInput" style="width:100%">
          <el-option :label="t('system.notice.notice')" value="notice" />
          <el-option :label="t('system.notice.announcement')" value="announcement" />
        </el-select>
      </el-form-item>
      <el-form-item :label="t('system.common.content')" prop="content_markdown">
        <div class="markdown-editor">
          <el-input
            v-model="contentInput"
            class="markdown-editor__input"
            type="textarea"
            :rows="10"
            :placeholder="t('system.notice.markdownPlaceholder')"
          />
          <section class="markdown-editor__preview" :aria-label="t('system.notice.markdownPreview')">
            <p v-if="!editorForm.content_markdown" class="markdown-editor__empty">
              {{ t('system.notice.previewEmpty') }}
            </p>
            <!-- 仅允许绑定由 renderMarkdown 禁用原始 HTML 并经 DOMPurify 清洗后的受限内容。 -->
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div v-else class="markdown-editor__content" v-html="renderedContent" />
          </section>
        </div>
      </el-form-item>
      <el-form-item v-if="isEdit" :label="t('system.common.status')">
        <el-radio-group v-model="statusInput">
          <el-radio value="1">{{ t('system.notice.published') }}</el-radio>
          <el-radio value="0">{{ t('system.notice.draft') }}</el-radio>
          <el-radio value="2">{{ t('system.notice.closed') }}</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">{{ t('system.common.cancel') }}</el-button>
      <el-button v-if="isEdit" v-perm="'system:notice:edit'" type="primary" :loading="submitLoading" @click="emit('submit')">{{ t('system.common.confirm') }}</el-button>
      <el-button v-else v-perm="'system:notice:add'" type="primary" :loading="submitLoading" @click="emit('submit')">{{ t('system.common.confirm') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FormInstance, FormRules } from 'element-plus'
import type { NoticeForm } from './useNoticeManagement'

const props = defineProps<{
  visible: boolean
  form: NoticeForm
  title: string
  isEdit: boolean
  rules: FormRules
  renderedContent: string
  submitLoading: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'update:form': [value: NoticeForm]
  close: []
  submit: []
  'form-ready': [form: FormInstance | undefined]
}>()

const { t } = useI18n()
const formRef = ref<FormInstance>()
const dialogVisible = computed({
  get: () => props.visible,
  set: value => emit('update:visible', value),
})
const editorForm = computed(() => props.form)
const titleInput = fieldModel('title')
const noticeTypeInput = fieldModel('notice_type')
const contentInput = fieldModel('content_markdown')
const statusInput = fieldModel('status')

watch(formRef, value => emit('form-ready', value), { immediate: true })

function fieldModel<Key extends keyof NoticeForm>(key: Key) {
  return computed({
    get: () => props.form[key],
    set: value => emit('update:form', { ...props.form, [key]: value }),
  })
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
  .markdown-editor { grid-template-columns: 1fr; }
}
</style>
