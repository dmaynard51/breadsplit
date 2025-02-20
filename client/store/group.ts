import Vue from 'vue'
import includes from 'lodash/includes'
import orderBy from 'lodash/orderBy'
import union from 'lodash/union'
import mapValues from 'lodash/mapValues'
import { oc } from 'ts-optchain'
import { MutationTree, ActionTree, GetterTree, ActionContext } from 'vuex'
import { GroupState, RootState, Group, ServerGroup, Operation, ClientGroup } from '~/types'
import { EvalTransforms, ProcessOperation, BasicCache, Transforms, MemberDefault, ClientGroupDefault, TransactionDefault, TransformKeys, IdMe } from '~/core'
import { GroupStateDefault } from '~/store'

const OperationCache = new BasicCache<Group>()
const Transformer = EvalTransforms<Group>(Transforms, { cacheObject: OperationCache })

function origin() {
  return window.location.origin
}

export const state = GroupStateDefault

export const getters: GetterTree<GroupState, RootState> = {

  evaluatedGroups(state) {
    return mapValues(state.groups, (group) => {
      if (!group)
        return undefined
      const { base, operations } = group
      if (!base)
        return undefined
      const result = Transformer(base, operations)
      return Object.freeze(result)
    })
  },

  current(state, getters) {
    if (!state.currentId)
      return undefined
    return getters.evaluatedGroups[state.currentId]
  },

  currentShareLink(state, getters) {
    const current = getters.current
    if (!current || !current.online)
      return undefined
    return `${origin()}/#/join?id=${current.id}`
  },

  currentId(state) {
    return state.currentId
  },

  all(state, getters) {
    return orderBy(Object.values(state.groups), ['lastchanged'], ['desc'])
      .map(group => getters.evaluatedGroups[group.id])
  },

  id: (state, getters) => (id: string) => {
    return getters.evaluatedGroups[id]
  },

  memberById: (state, getters) => ({ groupId, uid }) => {
    groupId = groupId || state.currentId
    const group = getters.evaluatedGroups[groupId]
    if (!group)
      return null
    return group.members[uid]
  },

  activeMembersOf: (state, getters) => (groupid?: string) => {
    groupid = groupid || state.currentId || ''
    const group = getters.evaluatedGroups[groupid] as Group
    if (!group)
      return []
    return Object.values(group.members).filter(m => !m.removed)
  },

  activeMembers(state, getters) {
    return getters.activeMembersOf(state.currentId)
  },

  isSyncing: state => (groupId?: string) => {
    groupId = groupId || state.currentId || ''
    const group = state.groups[groupId]
    return !!(group.syncingOperations.length)
  },

  unsyncedOperationsOf: state => (id?: string) => {
    id = id || state.currentId || ''
    const group = state.groups[id]
    const isUnsynced = (o: Operation) => !(group.syncingOperations || []).includes(o.hash)
    return group.operations.filter(isUnsynced)
  },

  unreadsOf: state => (id?: string) => {
    id = id || state.currentId || ''
    return state.unreads[id] || 0
  },
}

function NewOperation(
  context: ActionContext<GroupState, RootState>,
  groupid: string,
  name: TransformKeys,
  data: any,
  meta: object = {}
) {
  meta = {
    ...meta,
    by: context.rootGetters['user/uid'] || IdMe,
    timestamp: +new Date(),
  }
  context.commit('newOperation', { id: groupid, name, data, meta })
}

export const actions: ActionTree<GroupState, RootState> = {

  add(context, payload) {
    const group = ClientGroupDefault(payload)
    group.base.activities.push({
      by: context.rootGetters['user/uid'] || IdMe,
      timestamp: +new Date(),
      action: 'insert',
      entity: 'group',
    })
    context.commit('add', group)
  },

  modify(context, { id, changes }) {
    NewOperation(context, id, 'modify_meta', changes)
  },

  addMember(context, { id, member }) {
    member = MemberDefault(member)
    NewOperation(context, id, 'insert_member', member)
  },

  removeMember(context, { id, memberid }) {
    NewOperation(context, id, 'remove_member', memberid)
  },

  editMember(context, { id, memberid, changes }) {
    NewOperation(context, id, 'modify_member', { id: memberid, changes })
  },

  // Transcations
  newTranscation(context, { id, trans }) {
    trans = TransactionDefault(trans)
    NewOperation(context, id, 'insert_transaction', trans)
  },

  removeTranscation(context, { id, transid }) {
    NewOperation(context, id, 'remove_transaction', transid)
  },

  // editTranscation(context, { id, transid, changes }) {
  //  NewOperation(context, id, 'modify_transaction', { id: transid, changes })
  // },

  changeMemberId(context, { id, from, to }) {
    NewOperation(context, id, 'change_member_id', { from, to })
  },
}

export const mutations: MutationTree<GroupState> = {

  switch(state, id: string | null) {
    state.currentId = id
  },

  // Groups
  add(state, group: ClientGroup) {
    Vue.set(state.groups, group.base.id, group)
    state.currentId = group.base.id
  },

  remove(state, id) {
    id = id || state.currentId
    state.currentId = null
    Vue.delete(state.groups, id)
  },

  removeOnlineGroups(state) {
    for (const id of Object.keys(state.groups)) {
      if (state.groups[id].online)
        Vue.delete(state.groups, id)
    }
  },

  newOperation(state, { id, name, data, meta }) {
    id = id || state.currentId
    const group = state.groups[id]
    if (group) {
      group.operations.push(ProcessOperation({ name, data, meta }))
      group.lastchanged = +new Date()
    }
  },

  // Members

  // Firebase
  onServerUpdate(state, { data, timestamp }) {
    if (!data || !data.id)
      return
    const group: ServerGroup = data
    if (!state.groups[group.id]) {
      Vue.set(state.groups, group.id, {
        id: group.id,
        online: true,
        operations: [],
        lastchanged: timestamp,
      })
    }

    const serverOperations = group.operations
    const localOperations = state.groups[group.id].operations || []
    const unsyncedOperations = localOperations.filter(
      o => !includes(serverOperations, o.hash)
    )

    const clientGroup = state.groups[group.id]

    const activitiesCount = oc(clientGroup).base.activities.length(0)

    clientGroup.syncingOperations = (clientGroup.syncingOperations || [])
      .filter(i => !serverOperations.includes(i))
    clientGroup.base = Object.freeze(group.present)
    clientGroup.operations = unsyncedOperations
    clientGroup.lastsync = timestamp

    const currentActivitiesCount = oc(clientGroup).base.activities.length(0)

    state.unreads[group.id] = Math.max(currentActivitiesCount - activitiesCount, 0)
  },

  clearUnreads(state, id) {
    state.unreads[id] = 0
  },

  syncOperations(state, { id, operations }) {
    const group = state.groups[id]
    group.syncingOperations = union(group.syncingOperations || [], operations.map(o => o.hash))
  },

  resetSyncingStates(state) {
    Object.values(state.groups).forEach((group) => {
      group.syncingOperations = []
    })
  },
}
