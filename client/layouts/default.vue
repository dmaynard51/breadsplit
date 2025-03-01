<template lang='pug'>
v-app(:dark='dark')
  app-global-style

  v-navigation-drawer(
    v-model='drawer', :mini-variant='miniVariant'
    :clipped='clipped', fixed, app, :mobile-break-point='mobileBreakPoint'
  )
    .height-100(v-rows='"max-content auto max-content"')
      div
        app-logo-name.clickable(v-ripple, @click.native='goHome()')
        v-divider

      div(style='overflow-y:auto')
        v-list-tile(
          v-for='(group, i) in groups'
          :key='i', :to='`/group/${group.id}`'
          router, exact)
          v-list-tile-action
            v-icon mdi-{{ group.icon }}
          v-list-tile-content
            v-list-tile-title(v-text='group.name')
          v-list-tile-action(v-if='group.online')
            template(v-if='isSync(group.id)')
              v-icon.syncing-icon(color='grey lighten-1', size='20') mdi-cloud-sync
            template(v-else)
              v-icon(color='grey lighten-1', size='20') mdi-cloud-outline

      .drawer-list-bottom.pb-2
        v-divider.mb-2
        // New group item
        v-list-tile(@click='openNewGroupDialog()')
          v-list-tile-action
            v-icon mdi-plus
          v-list-tile-content
            v-list-tile-title {{$t('ui.group_editing.new_group')}}

        // Sign in
        template(v-if='user.anonymous')
          v-list-tile(@click='$refs.login.open()')
            v-list-tile-action
              v-avatar(size='36', color='#00000020', style='margin: -6px;')
                v-icon mdi-account
            v-list-tile-content
              v-list-tile-title {{$t('ui.sign_in')}}

        // User profile
        template(v-else)
          v-list-tile(@click='promptLogout()')
            v-list-tile-action
              v-avatar(size='36', color='#00000020', style='margin: -6px;')
                img(:src='user.avatar_url')
            v-list-tile-content
              v-list-tile-title {{ user.name || user.email }}
            v-list-tile-action(v-if='!userIsOnline')
              v-icon(color='red', size='20') mdi-cloud-off-outline

        // Settings
        v-list-tile(@click='openSettings()')
          v-list-tile-action
            v-icon mdi-settings
          v-list-tile-content
            v-list-tile-title {{$t('ui.settings')}}

  v-toolbar.app-toolbar(
    :clipped-left='clipped' app flat color='transparent' height='60'
    ).primary--text
    v-btn(icon, flat, @click='drawer = !drawer')
      v-icon(color='primary') mdi-menu
    v-toolbar-title(v-text='title')
    v-spacer
    v-toolbar-items
      template(v-if='current')
        template(v-if='isSync()')
          v-btn(icon, flat).syncing-icon
            v-icon(color='primary') mdi-cloud-sync
        template(v-if='currentShareLink')
          v-btn(icon, flat, @click='copyShareLink()')
            v-icon.op-50 mdi-share-variant
        v-menu(offset-y='')
          v-btn(icon, flat, slot='activator')
            v-icon.op-50 mdi-dots-vertical
          v-list
            v-list-tile(v-for='(item, index) in group_menu', :key='index', @click='onGroupMenu(item.key)')
              v-list-tile-title {{ $t(item.title) }}

      // User profile
      template(v-if='!user.anonymous')
        v-avatar(size='36', @click='promptLogout()', color='#00000020').avatar-in-toolbar
          img(:src='user.avatar_url')

  v-content
    nuxt

  app-global-components
  app-global-dialogs

  app-login(ref='login')

  app-dialog(ref='welcome', :fullscreen='false')
    app-welcome
</template>

<script lang='ts'>
import { setTimeout } from 'timers'
import { Component, Getter, Mutation, mixins } from 'nuxt-property-decorator'
import { Group, UserInfo } from '~/types'
import { RELEASE_CHANNEL, DEBUG } from '~/../meta/env'
import { GroupMixin, CommonMixin, NavigationMixin } from '~/mixins'
import Dialog from '~/components/global/Dialog.vue'
import head from './head'

@Component({
  head,
})
export default class DefaultLayout extends mixins(CommonMixin, NavigationMixin, GroupMixin) {
  // Data
  clipped = false
  drawer = false
  fixed = false
  miniVariant = false
  mobileBreakPoint = 700
  channel: string = RELEASE_CHANNEL
  debug = DEBUG

  @Getter('group/all') groups!: Group[]
  @Getter('group/current') current: Group | undefined
  @Getter('group/currentShareLink') currentShareLink: string | undefined
  @Getter('user/me') user!: UserInfo
  @Getter('user/uid') uid: string | undefined
  @Getter('user/online') userIsOnline!: boolean
  @Getter('dark') dark!: boolean

  @Mutation('group/remove') removeGroup

  $refs!: {
    welcome: Dialog
  }

  // Computed

  get title() {
    if (this.current)
      return this.current.name
    else
      return this.$t('appname')
  }
  get group_menu() {
    const menu: ({title: string; key: string})[] = []

    menu.push({ title: 'ui.menu.edit_group', key: 'edit' })
    if (this.current && !this.current.online && this.uid)
      menu.push({ title: 'ui.menu.make_group_online', key: 'transfer_online' })
    menu.push({ title: 'ui.menu.remove_group', key: 'delete' })

    return menu
  }

  // Methods
  mounted() {
    if (!this.isMobile)
      this.drawer = true

    setTimeout(() => this.checkFirstStart(), 1000)
  }

  async onGroupMenu(key) {
    const groupid = this.$store.state.group.currentId
    const group = this.$store.state.group.groups[groupid].base

    switch (key) {
      case 'delete':
        if (await this.$confirm(`確定要刪除 ${group.name} ?`)) {
          this.$apploading.open('Deleting group')
          if (this.current && this.current.online)
            await this.$fire.deleteGroup(groupid)
          this.removeGroup()
          this.$apploading.close()
          this.gotoHome()
        }
        break

      case 'transfer_online':
        if (await this.$confirm('Are you sure?')) {
          this.$apploading.open('Converting to Online group')
          try {
            await this.$fire.publishGroup(this.$store.state.group.currentId)
          }
          catch (e) {
            // eslint-disable-next-line
            console.error(e)
            // TODO:ERROR error handling
          }
          this.$apploading.close()
        }

        break

      case 'sync':
        await this.syncCurrentGroup()
        break

      case 'edit':
        this.openDialog('newgroup', { mode: 'edit' })
        break
    }
  }

  async openNewGroupDialog() {
    this.tryCloseDrawer()
    this.openDialog('newgroup')
  }

  async promptLogout() {
    if (await this.$confirm('Are you sure to logout?')) {
      await this.$fire.logout()
      this.gotoHome()
    }
  }

  async openSettings() {
    this.tryCloseDrawer()
    this.openDialog('settings')
  }

  goHome() {
    this.tryCloseDrawer()
    this.gotoHome()
  }

  tryCloseDrawer() {
    if (this.isMobile)
      this.drawer = false
  }

  async syncCurrentGroup() {
    if (this.current)
      await this.$fire.manualSync(this.current.id)
  }

  async copyShareLink() {
    if (this.currentShareLink)
      await this.$copyText(this.currentShareLink)
    this.$snack(this.$t('ui.share_link_copied', '').toString())
  }

  isSync(id) {
    return this.$store.getters['group/isSyncing'](id)
  }

  async checkFirstStart() {
    if (!this.$store.state.app.init) {
      this.$store.commit('init')
      await this.$refs.welcome.open()
    }
  }
}
</script>

<style lang='stylus'>
.app-toolbar
  .v-toolbar__content
    padding-right 2px

.v-navigation-drawer
  .v-list__tile
    height 52px

  &:not(.v-navigation-drawer--mini-variant)
    .v-list
      padding 10px 0

    .v-list__tile
      padding 6px 24px

.avatar-in-toolbar
  margin 12px
  cursor pointer
</style>
