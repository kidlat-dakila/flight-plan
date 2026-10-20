import { upgradedClassifications } from "@/procedures/get-review-preferences/utils/legacy-classifications"

type FlatValues = readonly unknown[]

interface UpgradedList {
  readonly at: number
  readonly names: readonly string[]
}

const CLASSIFICATION_KEYS: readonly string[] = ["classifications", "diffClassifications"]

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === "object" && value !== null && !Array.isArray(value)

const isIndex = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0

const listIndicesOf = (values: FlatValues): readonly number[] => [
  ...new Set(values.filter(isRecord).flatMap((record) => CLASSIFICATION_KEYS.map((key) => record[key]).filter(isIndex))),
]

const namesAt = (values: FlatValues, at: number): readonly string[] | null => {
  const list = values[at]
  if (!Array.isArray(list) || !list.every(isIndex)) return null
  const names = list.map((index) => values[index])
  return names.every((name) => typeof name === "string") ? names : null
}

const upgradedListAt = (values: FlatValues, at: number): UpgradedList[] => {
  const names = namesAt(values, at)
  if (names === null) return []
  const upgraded = upgradedClassifications(names)
  const isUnchanged = upgraded.length === names.length && upgraded.every((name, position) => name === names[position])
  return isUnchanged ? [] : [{ at, names: upgraded }]
}

export const withCurrentClassifications = (values: FlatValues): FlatValues => {
  const upgradedLists = listIndicesOf(values).flatMap((at) => upgradedListAt(values, at))
  const addedNames = [...new Set(upgradedLists.flatMap(({ names }) => names))]
  const indexByName = new Map(addedNames.map((name, position) => [name, values.length + position] as const))
  const listByIndex = new Map(upgradedLists.map(({ at, names }) => [at, names.map((name) => indexByName.get(name))] as const))
  return [...values.map((value, at) => listByIndex.get(at) ?? value), ...addedNames]
}
