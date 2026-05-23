import type { App } from 'vue'
import permission from './permission'
import debounce from './debounce'
import copy from './copy'
import throttle from './throttle'
import watermark from './watermark'
import lazy from './lazy'
import longpress from './longpress'

export default {
  install(app: App) {
    app.directive('permission', permission)
    app.directive('debounce', debounce)
    app.directive('copy', copy)
    app.directive('throttle', throttle)
    app.directive('watermark', watermark)
    app.directive('lazy', lazy)
    app.directive('longpress', longpress)
  },
}
