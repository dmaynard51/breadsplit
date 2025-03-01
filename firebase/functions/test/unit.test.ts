import * as path from 'path'
import * as admin from 'firebase-admin'
import * as functions from '../src'
import { Group, Operation, Transaction } from '../../../types'
import { GroupDefault, TransactionDefault } from '../../../core'
import { deleteCollection } from './_utils'

/* eslint-disable @typescript-eslint/no-var-requires */
const initTest = require('firebase-functions-test')

const keypath = process.env.ONLINE_TEST_KEY_PATH || path.join(__dirname, './service-account-key.json')
const projectId = process.env.FIREBASE_PROJECT_ID || 'breadsplit-test'

const test = initTest({ projectId }, path.resolve(keypath))

describe('Cloud Functions', () => {
  const collection = admin.firestore().collection('groups')

  beforeAll(async () => {
    await deleteCollection(admin.firestore(), 'groups')
    expect(await test.wrap(functions.groupsCount)()).toEqual(0)
  })

  afterAll(async () => {
    // Do cleanup tasks.
    test.cleanup()
    // Reset the data
    await deleteCollection(admin.firestore(), 'groups')
  })

  describe('Get group count', () => {
    it('zero when empty', async () => {
      // Wrap the function
      const wrapped = test.wrap(functions.groupsCount)

      // Call the wrapped function with the snapshot you constructed.
      expect(await wrapped()).toEqual(0)
    })

    it('add one', async () => {
      const wrapped = test.wrap(functions.groupsCount)

      await collection.doc('addone').set({})
      expect(await wrapped()).toEqual(1)
      await collection.doc('addone').delete()
      expect(await wrapped()).toEqual(0)
    })
  })

  describe('functions', () => {
    let groupid = '233'

    it('PublishGroup', async () => {
      const wrapped = test.wrap(functions.publishGroup)

      const group: Group = GroupDefault({
        id: '233',
        name: 'Good',
      })
      const { id } = await wrapped({ group }, { auth: { uid: 'yes' } })
      groupid = id
    })

    it('uploadOperations', async () => {
      const wrapped = test.wrap(functions.uploadOperations)

      const trans: Transaction = TransactionDefault({
        id: '2332',
        currency: 'USD',
        total_fee: 200,
      })
      const operations: Operation[] = [{
        name: 'insert_transaction',
        timestamp: +new Date(),
        hash: '00',
        data: trans,
      }]
      await wrapped({ id: groupid, operations }, { auth: { uid: 'yes' } })
    })
  })
})
