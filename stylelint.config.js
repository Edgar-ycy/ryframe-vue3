/** @type {import('stylelint').Config} */
export default {
  extends: [
    'stylelint-config-standard-scss',
    'stylelint-config-recommended-vue/scss',
  ],
  rules: {
    'custom-property-pattern': null,
    'keyframes-name-pattern': null,
    'selector-class-pattern': null,
    'scss/dollar-variable-pattern': null,
  },
}
