import { differenceWith } from 'lodash-es'
import objectHash from 'object-hash'

export const asArray = (x) => (Array.isArray(x) ? x : [x])

/* eslint-disable-next-line max-params */
export function map(value, x1, y1, x2, y2) {
  return (((value - x1) * (y2 - x2)) / (y1 - x1)) + x2
}

export const getEnumByValue = (myEnum, enumValue) => {
  const keys = Object.keys(myEnum).filter((x) => myEnum[x] === enumValue)
  return keys.length > 0 ? keys[0] : null
}

export const diffByHash = (a, b) => differenceWith(a, b, (a, b) => objectHash(a) === objectHash(b))
