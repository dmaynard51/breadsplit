<template lang='pug'>
div
  v-icon.error-icon(size='64') mdi-{{error.icon || 'alert-circle-outline'}}
  .error-code.text-xs-center {{error.statusCode}}
  .error-desc.text-xs-center {{error.message}}
  v-btn.error-return(flat, color='primary', to='/', nuxt) Home
  v-btn.error-return(flat, color='primary', @click='reload()') Reload
</template>

<script lang='ts'>
import { Component, Prop, Vue } from 'nuxt-property-decorator'

@Component
export default class DefaultErrorPage extends Vue {
  @Prop({ default: () => ({}) }) readonly error: any
  @Prop({ default: () => ({}) }) readonly payload: any

  reload() {
    window.location.reload()
  }
}
</script>
