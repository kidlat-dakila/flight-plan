import type { ReviewArtifact } from "@flightplan/configurations"
import {
  getAllFixtureCases,
  getFixtureRepository,
  getReviewArtifactFixture,
  UnknownFixtureError,
} from "@flightplan/playground-fixtures"
import { isMissingFile, listSnapshotNames, readCaseArtifact, readTraceSnapshot } from "./case-files"
import { TRACE_FIXTURE_FOLDERS, type TraceFixtureFolders } from "./fixture-folders"

export { PLAYGROUNDS_FOLDER, TRACE_FIXTURE_FOLDERS, type TraceFixtureFolders } from "./fixture-folders"
export { listPlaygrounds, readPlayground, type PlaygroundCase, type PlaygroundEntry } from "./playgrounds"

export type TraceFixtureSource = "playground" | "lab"

export interface TraceFixtureEntry {
  readonly id: string
  readonly source: TraceFixtureSource
  readonly kind: string
  readonly name: string
  readonly title: string
}

const ID_SEPARATOR = "/"
const FIXTURE_ID_PATTERN = /^(playground|lab)\/([a-z0-9][a-z0-9-]*)\/([a-z0-9][a-z0-9-]*)$/

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

const listPlaygroundKind = async (testCasesPath: string, kind: string): Promise<TraceFixtureEntry[]> => {
  const { targets } = await getFixtureRepository(testCasesPath, kind)
  return targets.map(({ branch, title }) => ({ id: idOf({ source: "playground", kind, name: branch }), source: "playground", kind, name: branch, title }))
}

const listLabKind = async (casesPath: string, kind: string): Promise<TraceFixtureEntry[]> => {
  const names = await listSnapshotNames(casesPath, kind)
  const snapshots = await Promise.all(names.map(async (name) => await readTraceSnapshot(casesPath, kind, name)))
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

export const readTraceFixture = async (id: string, folders: TraceFixtureFolders = TRACE_FIXTURE_FOLDERS): Promise<ReviewArtifact | null> => {
  const fixtureName = parseFixtureId(id)
  if (fixtureName === null) return null
  return fixtureName.source === "playground"
    ? await readPlaygroundFixture(folders.playground, fixtureName)
    : await readCaseArtifact(folders.lab, fixtureName.kind, fixtureName.name)
}
