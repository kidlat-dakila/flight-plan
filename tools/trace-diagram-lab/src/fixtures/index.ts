import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import type { ReviewArtifact } from "@flightplan/configurations"
import {
  applyDiffs,
  getAllFixtureCases,
  getAllReviewArtifactFixturesByCase,
  getFixtureRepository,
  getReviewArtifactFixture,
  readRepositoryFiles,
  readStoredGroups,
  toReviewArtifact,
  UnknownFixtureError,
} from "@flightplan/playground-fixtures"
import { toCaseSnapshot, traceSnapshotSchema, type TraceSnapshot } from "./trace-snapshot"

export type TraceFixtureSource = "playground" | "lab"

export interface TraceFixtureEntry {
  readonly id: string
  readonly source: TraceFixtureSource
  readonly kind: string
  readonly name: string
  readonly title: string
}

export interface TraceFixtureFolders {
  readonly playground: string
  readonly lab: string
}

const LAB_PATH = fileURLToPath(new URL("../..", import.meta.url))

export const TRACE_FIXTURE_FOLDERS: TraceFixtureFolders = {
  playground: join(LAB_PATH, "..", "playground-fixtures", "test-cases"),
  lab: join(LAB_PATH, "cases"),
}

const ID_SEPARATOR = "/"
const FIXTURE_ID_PATTERN = /^(playground|lab)\/([a-z0-9][a-z0-9-]*)\/([a-z0-9][a-z0-9-]*)$/
const REPOSITORY_FOLDER = "repo"
const SNAPSHOT_FOLDER = "snapshots"
const SNAPSHOT_SUFFIX = ".snapshot.json"
const CODE_BLOCKS_FOLDER = "code-blocks"
const CODE_BLOCKS_SUFFIX = ".code-blocks.json"
const MISSING_FILE_CODE = "ENOENT"
const LINE_BREAK = "\n"
const SEGMENTED_MINIMUM = 2

interface FixtureName {
  readonly source: TraceFixtureSource
  readonly kind: string
  readonly name: string
}

const idOf = ({ source, kind, name }: FixtureName): string => [source, kind, name].join(ID_SEPARATOR)

const isSource = (value: string): value is TraceFixtureSource => value === "playground" || value === "lab"

const parseFixtureId = (id: string): FixtureName | null => {
  const match = FIXTURE_ID_PATTERN.exec(id)
  if (match === null) return null
  const [, source, kind, name] = match
  return isSource(source) ? { source, kind, name } : null
}

const isMissingFile = (error: unknown): boolean =>
  error instanceof Error && "code" in error && error.code === MISSING_FILE_CODE

const readTextOrNull = async (path: string): Promise<string | null> => {
  try {
    return await readFile(path, "utf8")
  } catch (error) {
    if (isMissingFile(error)) return null
    throw error
  }
}

const snapshotNameOf = (fixtureName: string): string => fixtureName.split(ID_SEPARATOR).at(-1) ?? fixtureName

const listPlaygroundKind = async (testCasesPath: string, kind: string): Promise<TraceFixtureEntry[]> => {
  const { targets } = await getFixtureRepository(testCasesPath, kind)
  return targets.map(({ branch, title }) => ({ id: idOf({ source: "playground", kind, name: branch }), source: "playground", kind, name: branch, title }))
}

const parseTraceSnapshot = (text: string): TraceSnapshot => {
  const parsed: unknown = JSON.parse(text)
  return traceSnapshotSchema.parse(parsed)
}

const snapshotPathOf = (casesPath: string, kind: string, name: string): string =>
  join(casesPath, kind, SNAPSHOT_FOLDER, `${name}${SNAPSHOT_SUFFIX}`)

const readLabSnapshot = async (casesPath: string, kind: string, name: string): Promise<TraceSnapshot | null> => {
  const text = await readTextOrNull(snapshotPathOf(casesPath, kind, name))
  return text === null ? null : parseTraceSnapshot(text)
}

const listLabKind = async (casesPath: string, kind: string): Promise<TraceFixtureEntry[]> => {
  const names = (await getAllReviewArtifactFixturesByCase(casesPath, kind)).map(snapshotNameOf)
  const snapshots = await Promise.all(names.map(async (name) => await readLabSnapshot(casesPath, kind, name)))
  return names.flatMap((name, position) => {
    const snapshot = snapshots[position]
    return snapshot === null ? [] : [{ id: idOf({ source: "lab", kind, name }), source: "lab" as const, kind, name, title: snapshot.title }]
  })
}

const listSource = async (casesPath: string, listKind: (casesPath: string, kind: string) => Promise<TraceFixtureEntry[]>): Promise<TraceFixtureEntry[]> => {
  const kinds = await getAllFixtureCases(casesPath)
  const entries = await Promise.all(kinds.map(async (kind) => await listKind(casesPath, kind)))
  return entries.flat()
}

export const listTraceFixtures = async (folders: TraceFixtureFolders = TRACE_FIXTURE_FOLDERS): Promise<readonly TraceFixtureEntry[]> => {
  const [playground, lab] = await Promise.all([listSource(folders.playground, listPlaygroundKind), listSource(folders.lab, listLabKind)])
  return [...playground, ...lab]
}

const readPlaygroundFixture = async (testCasesPath: string, { kind, name }: FixtureName): Promise<ReviewArtifact | null> => {
  try {
    return await getReviewArtifactFixture(testCasesPath, [kind, name].join(ID_SEPARATOR))
  } catch (error) {
    if (error instanceof UnknownFixtureError || isMissingFile(error)) return null
    throw error
  }
}

const readLabFixture = async (casesPath: string, { kind, name }: FixtureName): Promise<ReviewArtifact | null> => {
  const snapshot = await readLabSnapshot(casesPath, kind, name)
  if (snapshot === null) return null
  const codeBlocksText = await readFile(join(casesPath, kind, CODE_BLOCKS_FOLDER, `${name}${CODE_BLOCKS_SUFFIX}`), "utf8")
  const baseFiles = await readRepositoryFiles(join(casesPath, kind, REPOSITORY_FOLDER))
  const headFiles = applyDiffs(baseFiles, [snapshot.diff.join(LINE_BREAK)])
  const isSegmented = snapshot.codegraph.segments.length >= SEGMENTED_MINIMUM
  return toReviewArtifact(toCaseSnapshot(snapshot), headFiles, readStoredGroups(codeBlocksText), isSegmented)
}

export const readTraceFixture = async (id: string, folders: TraceFixtureFolders = TRACE_FIXTURE_FOLDERS): Promise<ReviewArtifact | null> => {
  const fixtureName = parseFixtureId(id)
  if (fixtureName === null) return null
  return fixtureName.source === "playground"
    ? await readPlaygroundFixture(folders.playground, fixtureName)
    : await readLabFixture(folders.lab, fixtureName)
}
