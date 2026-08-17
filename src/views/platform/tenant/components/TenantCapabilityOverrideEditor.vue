<template>
  <div class="override-editor" aria-live="polite">
    <div v-if="loading" v-loading="true" class="loading-panel" />
    <el-alert
      v-else-if="loadError"
      :title="t('productPlans.capabilityCatalogUnavailable')"
      type="error"
      show-icon
      :closable="false"
    >
      <el-button type="danger" plain @click="loadCatalog">
        {{ t('productPlans.retry') }}
      </el-button>
    </el-alert>
    <template v-else>
      <el-alert
        v-if="unknownCodes.length"
        :title="t('productPlans.capabilityClientMismatch', { codes: unknownCodes.join(', ') })"
        type="error"
        show-icon
        :closable="false"
      />
      <article v-for="descriptor in catalog" :key="descriptor.code" class="override-card">
        <header>
          <div>
            <strong>{{ descriptor.name }}</strong>
            <code>{{ descriptor.code }}</code>
            <p>{{ descriptor.description }}</p>
          </div>
          <div class="override-toggle">
            <span>{{ t('productPlans.overrideMode') }}</span>
            <el-switch
              :model-value="Boolean(selectedOverride(descriptor.code))"
              :aria-label="descriptor.name"
              @change="toggleOverride(descriptor, Boolean($event))"
            />
          </div>
        </header>

        <div v-if="selectedOverride(descriptor.code)" class="override-config">
          <el-form-item :label="t('productPlans.enabled')">
            <el-switch
              :model-value="selectedOverride(descriptor.code)?.enabled"
              :disabled="!descriptor.deployment_available
                && !selectedOverride(descriptor.code)?.enabled"
              @update:model-value="updateEnabled(descriptor.code, Boolean($event))"
            />
          </el-form-item>
          <el-form-item :label="t('productPlans.variant')">
            <el-select
              :model-value="selectedOverride(descriptor.code)?.variant_code"
              @update:model-value="updateVariant(descriptor, String($event))"
            >
              <el-option
                v-for="variant in descriptor.variants"
                :key="variant.code"
                :label="`${variant.code} · schema v${variant.schema_version}`"
                :value="variant.code"
              />
            </el-select>
          </el-form-item>
          <component
            :is="editorFor(descriptor.code)"
            v-if="editorFor(descriptor.code)"
            :model-value="selectedOverride(descriptor.code)?.config ?? {}"
            :variant-code="selectedOverride(descriptor.code)?.variant_code ?? ''"
            :schema-version="selectedOverride(descriptor.code)?.schema_version ?? 0"
            @update:model-value="updateConfig(descriptor.code, $event)"
          />
          <el-alert
            v-else
            :title="t('productPlans.capabilityEditorUnavailable')"
            type="error"
            show-icon
            :closable="false"
          />
        </div>
      </article>
    </template>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent, markRaw, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  listProductCapabilities,
  type CapabilityOverrideInput,
  type EffectiveProductCapability,
  type ProductCapabilityDescriptor,
} from '@/api/modules/productPlan'
import { findFeatureManifest } from '@/features/registry'
import { requireOperationData } from '@/shared/http/client'

const props = defineProps<{ effectiveCapabilities: EffectiveProductCapability[] }>()
const model = defineModel<CapabilityOverrideInput[]>({ required: true })
const { t } = useI18n()
const catalog = ref<ProductCapabilityDescriptor[]>([])
const loading = ref(false)
const loadError = ref(false)
const editorCache = new Map<string, Component>()

const unknownCodes = computed(() => {
  const known = new Set(catalog.value.map(descriptor => descriptor.code))
  return model.value.map(item => item.capability_code).filter(code => !known.has(code))
})

onMounted(() => { void loadCatalog() })

async function loadCatalog(): Promise<void> {
  loading.value = true
  loadError.value = false
  try {
    const value = requireOperationData(await listProductCapabilities())
    catalog.value = [...value].sort((left, right) => left.code.localeCompare(right.code))
  }
  catch {
    catalog.value = []
    loadError.value = true
  }
  finally {
    loading.value = false
  }
}

function selectedOverride(code: string): CapabilityOverrideInput | undefined {
  return model.value.find(item => item.capability_code === code)
}

function toggleOverride(descriptor: ProductCapabilityDescriptor, enabled: boolean): void {
  if (!enabled) {
    model.value = model.value.filter(item => item.capability_code !== descriptor.code)
    return
  }
  if (selectedOverride(descriptor.code)) return
  const effective = props.effectiveCapabilities.find(item => item.capability_code === descriptor.code)
  const effectiveVariant = descriptor.variants.find(variant => (
    variant.code === effective?.variant_code
    && variant.schema_version === effective.schema_version
  ))
  const variant = effectiveVariant ?? descriptor.variants[0]
  if (!variant) return
  model.value = [...model.value, {
    capability_code: descriptor.code,
    enabled: effective?.enabled ?? true,
    variant_code: variant.code,
    schema_version: variant.schema_version,
    config: effective?.config ? { ...effective.config } : {},
  }]
}

function updateEnabled(code: string, enabled: boolean): void {
  replaceOverride(code, item => ({ ...item, enabled }))
}

function updateVariant(descriptor: ProductCapabilityDescriptor, variantCode: string): void {
  const variant = descriptor.variants.find(item => item.code === variantCode)
  if (!variant) return
  replaceOverride(descriptor.code, item => ({
    ...item,
    variant_code: variant.code,
    schema_version: variant.schema_version,
    config: {},
  }))
}

function updateConfig(code: string, config: Record<string, unknown>): void {
  replaceOverride(code, item => ({ ...item, config: { ...config } }))
}

function replaceOverride(
  code: string,
  update: (item: CapabilityOverrideInput) => CapabilityOverrideInput,
): void {
  model.value = model.value.map(item => item.capability_code === code ? update(item) : item)
}

function editorFor(code: string): Component | undefined {
  const cached = editorCache.get(code)
  if (cached) return cached
  const manifest = findFeatureManifest(code)
  if (!manifest) return undefined
  const editor = markRaw(defineAsyncComponent(
    () => manifest.planConfigEditor().then(module => module.default),
  ))
  editorCache.set(code, editor)
  return editor
}

function validate(): boolean {
  if (loading.value || loadError.value || unknownCodes.value.length > 0) return false
  if (new Set(model.value.map(item => item.capability_code)).size !== model.value.length) {
    return false
  }
  return model.value.every((item) => {
    const descriptor = catalog.value.find(value => value.code === item.capability_code)
    const variant = descriptor?.variants.find(value => (
      value.code === item.variant_code && value.schema_version === item.schema_version
    ))
    const manifest = findFeatureManifest(item.capability_code)
    return Boolean(
      descriptor
      && variant
      && (manifest?.allowedVariants as readonly string[] | undefined)?.includes(item.variant_code)
      && item.config
      && typeof item.config === 'object'
      && !Array.isArray(item.config),
    )
  })
}

defineExpose({ validate })
</script>

<style scoped>
.override-editor {
  display: grid;
  gap: 12px;
  width: 100%;
}

.loading-panel {
  min-height: 120px;
}

.override-card {
  padding: 14px;
  border: 1px solid var(--el-border-color);
  border-radius: 10px;
  background: var(--el-fill-color-blank);
}

.override-card header,
.override-toggle {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.override-card strong,
.override-card code {
  display: block;
}

.override-card code,
.override-card p,
.override-toggle span {
  color: var(--el-text-color-secondary);
}

.override-card p {
  margin: 7px 0 0;
  line-height: 1.5;
}

.override-toggle {
  align-items: center;
  flex: none;
}

.override-config {
  display: grid;
  gap: 10px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.override-config :deep(.el-form-item) {
  margin-bottom: 0;
}

@media (width <= 560px) {
  .override-card header {
    flex-direction: column;
  }

  .override-toggle {
    width: 100%;
  }
}
</style>
