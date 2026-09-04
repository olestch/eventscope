export interface RandomStream {
  next(): number
  integer(min: number, maxExclusive: number): number
  pick<T>(values: readonly T[]): T
  weightedPick<T>(values: readonly T[], weight: (value: T) => number): T
  chance(probability: number): boolean
}

function hashSeed(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function createRandomStream(seed: string, streamName: string): RandomStream {
  let state = hashSeed(`${seed}::${streamName}`)
  const next = () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }

  return {
    next,
    integer(min, maxExclusive) {
      return min + Math.floor(next() * (maxExclusive - min))
    },
    pick<T>(values: readonly T[]) {
      if (!values.length) throw new Error('Cannot pick from an empty collection')
      return values[Math.floor(next() * values.length)]!
    },
    weightedPick<T>(values: readonly T[], weight: (value: T) => number) {
      if (!values.length) throw new Error('Cannot pick from an empty collection')
      const total = values.reduce((sum, value) => sum + weight(value), 0)
      let cursor = next() * total
      for (const value of values) {
        cursor -= weight(value)
        if (cursor <= 0) return value
      }
      return values[values.length - 1]!
    },
    chance(probability) {
      return next() < probability
    }
  }
}
