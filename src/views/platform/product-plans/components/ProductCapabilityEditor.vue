<template>
  <div class="capability-editor" aria-live="polite">
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
      <el-empty
        v-if="catalog.length === 0"
        :description="t('productPlans.capabilityCatalogEmpty')"
        :image-size="56"
      />
      <article v-for="descriptor in catalog" :key="descriptor.code" class="capability-card">
        <header>
          <div>
            <strong>{{ descriptor.name }}</strong>
            <code>{{ descriptor.code }}</code>
            <p>{{ descriptor.description }}</p>
          </div>
          <div class="capability-state">
            <el-tag :type="descriptor.deployment_available ? 'success' : 'danger'" effect="plain">
              {{
                descriptor.deployment_available
                  ? t('productPlans.deploymentAvailable')
                  : t('productPlans.deploymentUnavailable')
              }}
            </el-tag>
            <el-switch
              :model-value="Boolean(selectedCapability(descriptor.code))"
              :disabled="!descriptor.deployment_available && !selectedCapability(descriptor.code)"
              :aria-label="descriptor.name"
              @change="toggleCapability(descriptor, Boolean($event))"
            />
          </div>
        </header>

        <div
          v-if="descriptor.dependencies.length || descriptor.conflicts.length"
          class="relationships"
        >
          <span v-for="dependency in descriptor.dependencies" :key="`dep-${dependency}`">
            {{ t('productPlans.dependsOn') }} <code>{{ dependency }}</code>
          </span>
          <span v-for="conflict in descriptor.conflicts" :key="`conflict-${conflict}`">
            {{ t('productPlans.conflictsWith') }} <code>{{ conflict }}</code>
          </span>
        </div>

        <div v-if="selectedCapability(descriptor.code)" class="capability-config">
          <el-form-item :label="t('productPlans.variant')">
            <el-select
              :model-value="selectedCapability(descriptor.code)?.variant_code"
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
            :model-value="selectedCapability(descriptor.code)?.config ?? {}"
            :variant-code="selectedCapability(descriptor.code)?.variant_code ?? ''"
            :schema-version="selectedCapability(descriptor.code)?.schema_version ?? 0"
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
  type ProductCapability,
  type ProductCapabilityDescriptor,
} from '@/api/modules/productPlan'
import { findFeatureManifest } from '@/features/registry'
import { requireOperationData } from '@/shared/http/client'

const model = defineModel<ProductCapability[]>({ required: true })
const { t } = useI18n()
const catalog = ref<ProductCapabilityDescriptor[]>([])
const loading = ref(false)
const loadError = ref(false)
const editorCache = new Map<string, Component>()

const unknownCodes = computed(() => {
  const known = new Set(catalog.value.map((descriptor) => descriptor.code))
  return model.value
    .map((capability) => capability.capability_code)
    .filter((code) => !known.has(code))
})

onMounted(() => {
  void loadCatalog()
})

async function loadCatalog(): Promise<void> {
  loading.value = true
  loadError.value = false
  try {
    const value = requireOperationData(await listProductCapabilities())
    catalog.value = [...value].sort((left, right) => left.code.localeCompare(right.code))
  } catch {
    catalog.value = []
    loadError.value = true
  } finally {
    loading.value = false
  }
}

function selectedCapability(code: string): ProductCapability | undefined {
  return model.value.find((capability) => capability.capability_code === code)
}

function toggleCapability(descriptor: ProductCapabilityDescriptor, enabled: boolean): void {
  const current = selectedCapability(descriptor.code)
  if (!enabled) {
    model.value = model.value.filter((capability) => capability.capability_code !== descriptor.code)
    return
  }
  if (current) return
  const variant = descriptor.variants[0]
  if (!variant) return
  model.value = [
    ...model.value,
    {
      capability_code: descriptor.code,
      variant_code: variant.code,
      schema_version: variant.schema_version,
      config: {},
    },
  ]
}

function updateVariant(descriptor: ProductCapabilityDescriptor, variantCode: string): void {
  const variant = descriptor.variants.find((item) => item.code === variantCode)
  if (!variant) return
  replaceCapability(descriptor.code, (capability) => ({
    ...capability,
    variant_code: variant.code,
    schema_version: variant.schema_version,
    config: {},
  }))
}

function updateConfig(code: string, config: Record<string, unknown>): void {
  replaceCapability(code, (capability) => ({ ...capability, config: { ...config } }))
}

function replaceCapability(
  code: string,
  update: (capability: ProductCapability) => ProductCapability,
): void {
  model.value = model.value.map((capability) =>
    capability.capability_code === code ? update(capability) : capability,
  )
}

function editorFor(code: string): Component | undefined {
  const cached = editorCache.get(code)
  if (cached) return cached
  const manifest = findFeatureManifest(code)
  if (!manifest) return undefined
  const editor = markRaw(
    defineAsyncComponent(() => manifest.planConfigEditor().then((module) => module.default)),
  )
  editorCache.set(code, editor)
  return editor
}

function validate(): boolean {
  if (loading.value || loadError.value || unknownCodes.value.length > 0) return false
  if (new Set(model.value.map((item) => item.capability_code)).size !== model.value.length) {
    return false
  }
  return model.value.every((capability) => {
    const descriptor = catalog.value.find((item) => item.code === capability.capability_code)
    const variant = descriptor?.variants.find(
      (item) =>
        item.code === capability.variant_code && item.schema_version === capability.schema_version,
    )
    const manifest = findFeatureManifest(capability.capability_code)
    return Boolean(
      descriptor &&
      variant &&
      (manifest?.allowedVariants as readonly string[] | undefined)?.includes(
        capability.variant_code,
      ) &&
      capability.config &&
      typeof capability.config === 'object' &&
      !Array.isArray(capability.config),
    )
  })
}

defineExpose({ validate })
</script>

<style scoped>
.capability-editor {
  display: grid;
  gap: 12px;
}

.loading-panel {
  min-height: 120px;
}

.capability-card {
  padding: 14px;
  border: 1px solid var(--el-border-color);
  border-radius: 10px;
  background: var(--el-fill-color-blank);
}

.capability-card header,
.capability-state,
.relationships {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.capability-card strong,
.capability-card code {
  display: block;
}

.capability-card code {
  margin-top: 3px;
  color: var(--el-text-color-secondary);
}

.capability-card p {
  margin: 7px 0 0;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.capability-state {
  align-items: center;
  flex: none;
}

.relationships {
  flex-wrap: wrap;
  justify-content: flex-start;
  margin-top: 10px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.relationships code {
  display: inline;
}

.capability-config {
  display: grid;
  gap: 10px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.capability-config :deep(.el-form-item) {
  margin-bottom: 0;
}

@media (width <= 560px) {
  .capability-card header {
    flex-direction: column;
  }

  .capability-state {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
