import { parseStored, STORED_SCHEMA_VERSION, unknownKeysIn, type UnknownKeys } from "@/procedures/get-review/utils/stored-review"

type FlatEntries = readonly unknown[]

type KeysByIndex = ReadonlyMap<number, ReadonlySet<string>>

const ROOT_INDEX = 0

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isPlainArray = (entry: unknown): entry is readonly unknown[] => Array.isArray(entry) && typeof entry[0] !== "string"

const parseFlat = (text: string): FlatEntries | null => {
  try {
    const flat: unknown = JSON.parse(text)
    return Array.isArray(flat) && isRecord(flat[ROOT_INDEX]) ? flat : null
  } catch {
    return null
  }
}

const indexOrNull = (next: unknown): number | null => (typeof next === "number" ? next : null)

const childIndexOf = (flat: FlatEntries, index: number, step: PropertyKey): number | null => {
  const entry = flat[index]
  if (isPlainArray(entry) && typeof step === "number") return indexOrNull(entry[step])
  if (isRecord(entry) && typeof step === "string") return indexOrNull(entry[step])
  return null
}

const indexAtPath = (flat: FlatEntries, path: readonly PropertyKey[]): number | null =>
  path.reduce<number | null>((index, step) => (index === null ? null : childIndexOf(flat, index, step)), ROOT_INDEX)

const keysByIndexOf = (flat: FlatEntries, unknownKeys: readonly UnknownKeys[]): KeysByIndex =>
  unknownKeys.reduce<KeysByIndex>((keysByIndex, { path, keys }) => {
    const index = indexAtPath(flat, path)
    return index === null ? keysByIndex : new Map([...keysByIndex, [index, new Set([...(keysByIndex.get(index) ?? []), ...keys])]])
  }, new Map())

const withoutKeys = (entry: Readonly<Record<string, unknown>>, keys: ReadonlySet<string>): Readonly<Record<string, unknown>> =>
  Object.fromEntries(Object.entries(entry).filter(([key]) => !keys.has(key)))

const withCurrentSchema = (flat: FlatEntries): FlatEntries => {
  const root = flat[ROOT_INDEX]
  return isRecord(root) ? [{ ...root, schema: flat.length }, ...flat.slice(ROOT_INDEX + 1), STORED_SCHEMA_VERSION] : flat
}

const withoutUnknownKeys = (flat: FlatEntries): FlatEntries => {
  const keysByIndex = keysByIndexOf(flat, unknownKeysIn(parseStored(JSON.stringify(flat))))
  return flat.map((entry, index) => {
    const keys = keysByIndex.get(index)
    return keys !== undefined && isRecord(entry) ? withoutKeys(entry, keys) : entry
  })
}

export const toCurrentShape = (text: string): string | null => {
  const flat = parseFlat(text)
  return flat === null ? null : JSON.stringify(withoutUnknownKeys(withCurrentSchema(flat)))
}
