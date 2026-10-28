import { join } from "node:path"
import { z } from "zod"
import type { ReviewArtifact } from "@flightplan/configurations"
import { getAllFixtureCases } from "@flightplan/playground-fixtures"
import { isMissingFile, listSnapshotNames, readCaseArtifact, readTextOrNull, readTraceSnapshot } from "./case-files"
import { PLAYGROUNDS_FOLDER } from "./fixture-folders"

export interface PlaygroundEntry {
  readonly id: string
  readonly language: string
  readonly framework: string
  readonly title: string
  readonly caseTitle: string
}

interface PlaygroundName {
  readonly language: string
  readonly framework: string
}

const ID_SEPARATOR = "/"
const FOLDER_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/
const PLAYGROUND_ID_PATTERN = /^([a-z0-9][a-z0-9-]*)\/([a-z0-9][a-z0-9-]*)$/
const BASE_FRAMEWORK = "base"
const META_FILE = "meta.json"
const BEFORE = -1
const AFTER = 1

const playgroundMetaSchema = z.object({ title: z.string() })

const playgroundIdOf = ({ language, framework }: PlaygroundName): string => [language, framework].join(ID_SEPARATOR)

const parsePlaygroundId = (id: string): PlaygroundName | null => {
  const match = PLAYGROUND_ID_PATTERN.exec(id)
  if (match === null) return null
  const [, language, framework] = match
  return { language, framework }
}

const inCodeOrder = (one: string, two: string): number => (one < two ? BEFORE : Number(one > two))

const inFrameworkOrder = (one: string, two: string): number => {
  if (one === two) return 0
  if (one === BASE_FRAMEWORK) return BEFORE
  if (two === BASE_FRAMEWORK) return AFTER
  return inCodeOrder(one, two)
}

const listFolderNames = async (path: string): Promise<string[]> => {
  try {
    return (await getAllFixtureCases(path)).filter((name) => FOLDER_NAME_PATTERN.test(name))
  } catch (error) {
    if (isMissingFile(error)) return []
    throw error
  }
}

const readPlaygroundTitle = async (languagePath: string, framework: string): Promise<string | null> => {
  const text = await readTextOrNull(join(languagePath, framework, META_FILE))
  if (text === null) return null
  const parsed: unknown = JSON.parse(text)
  return playgroundMetaSchema.parse(parsed).title
}

const firstSnapshotNameOf = async (languagePath: string, framework: string): Promise<string | null> =>
  (await listSnapshotNames(languagePath, framework)).at(0) ?? null

const readPlaygroundEntry = async (playgroundsPath: string, name: PlaygroundName): Promise<PlaygroundEntry | null> => {
  const languagePath = join(playgroundsPath, name.language)
  const snapshotName = await firstSnapshotNameOf(languagePath, name.framework)
  if (snapshotName === null) return null
  const [title, snapshot] = await Promise.all([
    readPlaygroundTitle(languagePath, name.framework),
    readTraceSnapshot(languagePath, name.framework, snapshotName),
  ])
  if (title === null || snapshot === null) return null
  return { id: playgroundIdOf(name), ...name, title, caseTitle: snapshot.title }
}

const listLanguage = async (playgroundsPath: string, language: string): Promise<PlaygroundEntry[]> => {
  const frameworks = [...await listFolderNames(join(playgroundsPath, language))].sort(inFrameworkOrder)
  const entries = await Promise.all(frameworks.map(async (framework) => await readPlaygroundEntry(playgroundsPath, { language, framework })))
  return entries.filter((entry): entry is PlaygroundEntry => entry !== null)
}

export const listPlaygrounds = async (playgroundsPath: string = PLAYGROUNDS_FOLDER): Promise<readonly PlaygroundEntry[]> => {
  const languages = [...await listFolderNames(playgroundsPath)].sort(inCodeOrder)
  const entries = await Promise.all(languages.map(async (language) => await listLanguage(playgroundsPath, language)))
  return entries.flat()
}

export const readPlayground = async (id: string, playgroundsPath: string = PLAYGROUNDS_FOLDER): Promise<ReviewArtifact | null> => {
  const name = parsePlaygroundId(id)
  if (name === null) return null
  const languagePath = join(playgroundsPath, name.language)
  const snapshotName = await firstSnapshotNameOf(languagePath, name.framework)
  return snapshotName === null ? null : await readCaseArtifact(languagePath, name.framework, snapshotName)
}
