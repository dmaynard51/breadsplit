// @ts-ignore
import JsCache from 'js-cache'
import { Transforms, EvalTransforms, GroupDefault, ProcessOperations } from '../../../core'
import { Group, Operation, TransOperationOption } from '../../../types'

const transformCache = new JsCache()
const transformCacheTTL = 10 * 24 * 60 * 60 * 1000 // 10 days

// warpper functions
export function ProcessServerOperations(operations: TransOperationOption[], uid: string, server_timestamp?: number): Operation[] {
  return ProcessOperations(operations).map((o): Operation => {
    return {
      ...o,
      uid,
      server_timestamp: server_timestamp || +new Date(),
    }
  })
}

const _eval = EvalTransforms<Group>(Transforms, {
  cacheObject: transformCache,
  cacheTTL: transformCacheTTL,
  shouldCache: (operation) => {
    // skip caches that is too old
    return operation.timestamp + transformCacheTTL > +new Date()
  },
})

export function Eval(operations: Operation[]): Group {
  const base: Group = GroupDefault()
  return _eval(base, operations)
}

export function omitDeep(data: any) {
  return JSON.parse(JSON.stringify(data))
}
