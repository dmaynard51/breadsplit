import Vue from 'vue'
import dayjs from 'dayjs'
import VueClipboard from 'vue-clipboard2'
import { RootState } from '~/types'

VueClipboard.config.autoSetContainer = true
Vue.use(VueClipboard)
Vue.use(() => {
  Vue.prototype.$dt = dayjs
})

export default ({ store }) => {
  // set dayjs locale on store locale changed
  store.watch(
    (state: RootState) => state.user_locale || state.browser_locale || 'en',
    (locale: string) => dayjs.locale((locale || '').toLowerCase()),
    { immediate: true }
  )
}
