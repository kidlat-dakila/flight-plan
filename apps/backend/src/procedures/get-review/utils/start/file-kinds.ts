import { countLabel } from "@/procedures/get-review/utils/count-label"

const KIND_BY_EXTENSION: ReadonlyMap<string, string> = new Map(Object.entries({
  ts: "TypeScript",
  mts: "TypeScript",
  cts: "TypeScript",
  tsx: "TSX",
  js: "JavaScript",
  mjs: "JavaScript",
  cjs: "JavaScript",
  jsx: "JSX",
  py: "Python",
  go: "Go",
  rs: "Rust",
  rb: "Ruby",
  java: "Java",
  kt: "Kotlin",
  swift: "Swift",
  cs: "C#",
  php: "PHP",
  c: "C",
  h: "C",
  cpp: "C++",
  hpp: "C++",
  vue: "Vue",
  svelte: "Svelte",
  html: "HTML",
  css: "CSS",
  scss: "SCSS",
  sql: "SQL",
  sh: "Shell",
  json: "JSON",
  yaml: "YAML",
  yml: "YAML",
  toml: "TOML",
  md: "Markdown",
  mdx: "Markdown",
}))

const OTHER_KIND = "other"
const NAMED_KIND_LIMIT = 6
const PATH_SEPARATOR = "/"
const EXTENSION_SEPARATOR = "."

interface FileKindCount {
  readonly kind: string
  readonly count: number
}

const extensionOf = (path: string): string => {
  const fileName = path.slice(path.lastIndexOf(PATH_SEPARATOR) + 1)
  const separatorIndex = fileName.lastIndexOf(EXTENSION_SEPARATOR)
  return separatorIndex <= 0 ? "" : fileName.slice(separatorIndex + 1).toLowerCase()
}

const fileKindOf = (path: string): string => KIND_BY_EXTENSION.get(extensionOf(path)) ?? OTHER_KIND

const withPathCounted = (counts: ReadonlyMap<string, number>, path: string): ReadonlyMap<string, number> => {
  const kind = fileKindOf(path)
  return new Map([...counts, [kind, (counts.get(kind) ?? 0) + 1]])
}

const NO_COUNTS: ReadonlyMap<string, number> = new Map()

const countKinds = (paths: readonly string[]): readonly FileKindCount[] =>
  [...paths.reduce(withPathCounted, NO_COUNTS)].map(([kind, count]) => ({ kind, count }))

const byCountThenKind = (left: FileKindCount, right: FileKindCount): number =>
  right.count - left.count || left.kind.localeCompare(right.kind)

const sumCounts = (counts: readonly FileKindCount[]): number => counts.reduce((total, { count }) => total + count, 0)

export const summarizeFileKinds = (paths: readonly string[]): readonly string[] => {
  const counts = countKinds(paths)
  const named = counts.filter(({ kind }) => kind !== OTHER_KIND).sort(byCountThenKind)
  const shown = named.slice(0, NAMED_KIND_LIMIT)
  const otherCount = sumCounts(counts) - sumCounts(shown)
  return [
    ...shown.map(({ kind, count }) => `${String(count)} ${kind}`),
    ...(otherCount > 0 ? [`${String(otherCount)} ${OTHER_KIND}`] : []),
  ]
}

export const changedFilesLabelOf = (paths: readonly string[]): string =>
  countLabel(paths.length, "changed file", "changed files")
