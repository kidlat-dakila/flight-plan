export const RENAMED_PARTS: ReadonlyMap<string, string> = new Map([
  ["journey", "traceDiagram"],
  ["blast", "blastDiagram"],
])

const FIELD_PATH_ROOT = /^[^.]+/

export const withRenamedKeys = (
  record: Readonly<Record<string, unknown>>,
  renamed: ReadonlyMap<string, string>,
): Record<string, unknown> =>
  Object.fromEntries(Object.entries(record).map(([key, value]) => [renamed.get(key) ?? key, value]))

export const renamedFieldPath = (path: string): string =>
  path.replace(FIELD_PATH_ROOT, (root) => RENAMED_PARTS.get(root) ?? root)
