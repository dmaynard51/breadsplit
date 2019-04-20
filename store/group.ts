import Vue from 'vue'
import { MutationTree, ActionTree, GetterTree } from 'vuex'
import { Group, Member } from '~/types'
import { GroupDefault, MemberDefault, GroupStateDefault } from '~/types/defaults'
import { GroupState, RootState } from '~/types/store'
import { merge } from 'lodash-es'

// Helpers
const CreateMember = (payload = {}): Member => {
  return merge(MemberDefault(), payload)
}

const CreateGroup = (payload = {}): Group => {
  const group = merge(GroupDefault(), payload)

  group.members = group.members.map(m => CreateMember(m))

  return group
}

// Store
export const state = GroupStateDefault

export const getters: GetterTree<GroupState, RootState> = {

  current(state) {
    if (!state.currentId)
      return undefined
    return state.groups[state.currentId] || undefined
  },

  groups(state) {
    return Object.values(state.groups)
  },

}

export const actions: ActionTree<GroupState, RootState> = {

}

export const mutations: MutationTree<GroupState> = {

  purge(state) {
    state.currentId = null
    Vue.set(state, 'groups', {})
  },

  switch(state, id: string | null) {
    state.currentId = id
  },

  // Groups
  add(state, payload) {
    const group = CreateGroup(payload)
    Vue.set(state.groups, group.id, group)
  },

  remove(state, id) {
    id = id || state.currentId
    state.currentId = null
    Vue.delete(state.groups, id)
  },

  edit(state, { id, changes }) {
    id = id || state.currentId
    merge(state.groups[id], changes)
  },

  // Members
  addMember(state, { id, member }) {
    id = id || state.currentId
    state.groups[id].members.push(CreateMember(member))
  },

  removeMember(state, { id, memberid }) {
    id = id || state.currentId
    const member = state.groups[id].members.find(m => m.id === memberid)
    const index = member ? state.groups[id].members.indexOf(member) : -1
    if (index > -1)
      state.groups[id].members.splice(index, 1)
  },

  editMember(state, { id, memberid, changes }) {
    id = id || state.currentId
    const member = state.groups[id].members.find(m => m.id === memberid)
    if (member) {
      for (const key of Object.keys(changes))
        Vue.set(member, key, changes[key])
    }
  },

}
