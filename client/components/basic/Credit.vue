<template lang='pug'>
.credit
  .section v{{version}} {{channel}} {{target}}
  br
  .buildinfo
    span Build {{buildtime}} - {{buildTimeFromNow}}
  .buildinfo
    span server <{{serverName}}>
  .my-2

  .newline

  .section
    span Made with
    v-icon.heart(color='#ff4057') mdi-heart
    span in Taiwan
  .copyright
    span Copyright © 2019 The BreadSplit Team
  .footer
    a.homepage(:href='socials.homepage' target='__blank') {{$t('ui.homepage')}}
    .divider
    a.privacy(@click='$refs.privacy.open()') {{$t('ui.privacy_policy')}}

  app-dialog(ref='privacy' :route='true')
    app-privacy
</template>

<script lang='ts'>
import { Component, Vue } from 'nuxt-property-decorator'
import dayjs from 'dayjs'
import socials from '~/../meta/socials'
import { APP_VERSION, BUILD_TARGET, BUILD_TIME, RELEASE_CHANNEL, FIREBASE_SERVER } from '~/../meta/env'

@Component
export default class Credit extends Vue {
  socials = socials
  code = []
  design = []
  version = APP_VERSION
  target = BUILD_TARGET
  buildtime = BUILD_TIME
  channel = RELEASE_CHANNEL
  serverName = FIREBASE_SERVER

  get buildTimeFromNow() {
    return dayjs(this.buildtime).fromNow()
  }
}
</script>

<style lang='stylus'>
.credit
  text-align center
  padding-top 30px
  padding-bottom 20px
  opacity 0.7

  .buildinfo
    font-size 0.85em
    opacity 0.5

  .copyright
    font-size 0.85em
    opacity 0.7

  .v-icon
    vertical-align bottom
    margin 0 3px
    font-size 1.5em

  .section, .divider, .badge
    display inline

  .divider:after
    content '|'
    margin 0 7px
    opacity 0.4

  .badge
    font-weight bold

  .newline
    height 8px

  .line-divider
    width 30px
    height 1px
    display inline-block
    background rgb(125,125,125)
    opacity 0.8
    margin 16px

  a
    text-decoration none
    color inherit
    transition 0.5s opacity ease-in-out
    opacity 0.5

    &:hover
      opacity 1

  .footer
    margin-top 0.5em
    font-size 0.9em
</style>
