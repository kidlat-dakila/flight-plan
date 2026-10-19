export interface KeySegment {
  readonly kind: "key"
  readonly name: string
}

export interface CallSegment {
  readonly kind: "call"
  readonly name: string
  readonly argument: string
}

export type PathSegment = KeySegment | CallSegment

export type ConfigValues = readonly string[] | null

const SEGMENT_SEPARATOR = "."
const CALL_PATTERN = /^(?<name>[^(]+)\((?<argument>[^)]*)\)$/
const ARGUMENT_INDEX_PATTERN = /^\d+$/
const WHITESPACE_PATTERN = /\s+/
export const ANY_KEY = "*"

const segmentOf = (written: string): PathSegment => {
  const call = CALL_PATTERN.exec(written)?.groups
  return call === undefined ? { kind: "key", name: written } : { kind: "call", name: call.name, argument: call.argument }
}

export const parseKeyPath = (keyPath: string): PathSegment[] => (keyPath === "" ? [] : keyPath.split(SEGMENT_SEPARATOR).map(segmentOf))

export const argumentIndexOf = ({ argument }: CallSegment): number | null => (ARGUMENT_INDEX_PATTERN.test(argument) ? Number(argument) : null)

export const fitsKey = (segment: KeySegment, key: string): boolean => segment.name === ANY_KEY || segment.name === key

export const valuesOrSilent = (values: readonly string[]): ConfigValues => (values.length === 0 ? null : values)

export const splitWords = (text: string): string[] => text.split(WHITESPACE_PATTERN).filter((word) => word !== "")

const leavesOf = (value: unknown): string[] => {
  if (typeof value === "string") return [value]
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === "object" && value !== null && !Array.isArray(value)

const childrenOf = (value: unknown, segment: KeySegment): unknown[] => {
  if (Array.isArray(value)) return value.flatMap((item: unknown) => childrenOf(item, segment))
  if (!isRecord(value)) return []
  return Object.entries(value).filter(([key]) => fitsKey(segment, key)).map(([, child]) => child)
}

const walk = (value: unknown, segments: readonly PathSegment[]): string[] => {
  if (segments.length === 0) return leavesOf(value)
  const [segment, ...rest] = segments
  return segment.kind === "call" ? [] : childrenOf(value, segment).flatMap((child) => walk(child, rest))
}

export const readPlainValues = (data: unknown, segments: readonly PathSegment[]): ConfigValues => valuesOrSilent(walk(data, segments))

export const holdsPlainSection = (data: unknown, segments: readonly PathSegment[]): boolean => {
  if (segments.length === 0) return isRecord(data)
  const [segment, ...rest] = segments
  return segment.kind === "key" && childrenOf(data, segment).some((child) => holdsPlainSection(child, rest))
}
