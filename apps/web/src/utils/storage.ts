import { migrateV1ToV2 } from './storageMigration'
import {
  createDefaultLocalData,
  defaultPracticeSettings,
  normalizeLocalDataV2,
  type QuizNestLocalData,
} from './storageSchema'

export const V1_STORAGE_KEY = 'quiznest.local-data.v1'
export const V2_STORAGE_KEY = 'quiznest.local-data.v2'
export const QUIZNEST_STORAGE_KEY = V2_STORAGE_KEY

export type StorageLike = Pick<
  Storage,
  'getItem' | 'setItem' | 'removeItem'
>

export {
  createDefaultLocalData,
  defaultPracticeSettings,
  normalizeLocalDataV2,
}
export type { QuizNestLocalData }

function parseStoredValue(rawValue: string) {
  try {
    return JSON.parse(rawValue) as unknown
  } catch {
    return undefined
  }
}

export function loadLocalData(
  storage: StorageLike = localStorage,
): QuizNestLocalData {
  let rawV2: string | null

  try {
    rawV2 = storage.getItem(V2_STORAGE_KEY)
  } catch {
    return createDefaultLocalData()
  }

  if (rawV2 !== null) {
    const parsedV2 = parseStoredValue(rawV2)
    return normalizeLocalDataV2(parsedV2) ?? createDefaultLocalData()
  }

  let rawV1: string | null

  try {
    rawV1 = storage.getItem(V1_STORAGE_KEY)
  } catch {
    return createDefaultLocalData()
  }

  if (rawV1 === null) {
    return createDefaultLocalData()
  }

  const parsedV1 = parseStoredValue(rawV1)
  const migrated = migrateV1ToV2(parsedV1)

  if (!migrated) {
    return createDefaultLocalData()
  }

  try {
    storage.setItem(V2_STORAGE_KEY, JSON.stringify(migrated))
  } catch {
    // Migration still succeeds in memory; the untouched v1 value remains a fallback.
  }

  return migrated
}

export function saveLocalData(
  data: QuizNestLocalData,
  storage: StorageLike = localStorage,
) {
  try {
    storage.setItem(V2_STORAGE_KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

export function removeLocalData(storage: StorageLike = localStorage) {
  let removed = true

  try {
    storage.removeItem(V2_STORAGE_KEY)
  } catch {
    removed = false
  }

  try {
    storage.removeItem(V1_STORAGE_KEY)
  } catch {
    removed = false
  }

  return removed
}
