import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'src/auto-imports.d.ts',
      'src/components.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'no-undef': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'vue/html-indent': ['error', 2],
      'vue/attributes-order': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/multi-word-component-names': 'off',
      'vue/singleline-html-element-content-newline': 'off',
    },
  },
  {
    files: ['src/shared/**/*.{ts,vue}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: [
            '@/app/**',
            '@/api/**',
            '@/components/**',
            '@/router/**',
            '@/stores/**',
            '@/views/**',
            'element-plus',
            'element-plus/**',
          ],
          message: 'shared 层只能依赖无业务状态的基础模块',
        }],
      }],
    },
  },
  {
    files: ['src/api/modules/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: [
            '@/app/**',
            '@/components/**',
            '@/router/**',
            '@/stores/**',
            '@/views/**',
            'element-plus',
            'element-plus/**',
          ],
          message: 'API 模块只能描述传输契约，不能依赖 UI、路由或状态层',
        }],
      }],
    },
  },
)
