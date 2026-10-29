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
}

export interface PlaygroundCase {
  readonly id: string
  readonly title: string
  readonly caseTitle: string
  readonly artifact: ReviewArtifact
}

interface PlaygroundName {
  readonly language: string
  readonly framework: string
}

interface CaseFolder {
  readonly id: string
  readonly casesPath: string
  readonly kind: string
}

interface CaseMeta {
  readonly title: string
  readonly language?: string
}

interface TitledCaseFolder {
  readonly folder: CaseFolder
  readonly meta: CaseMeta
  readonly snapshotName: string
}

const ID_SEPARATOR = "/"
const FOLDER_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/
const PLAYGROUND_ID_PATTERN = /^([a-z0-9][a-z0-9-]*)\/([a-z0-9][a-z0-9-]*)$/
const BASE_FRAMEWORK = "base"
const META_FILE = "meta.json"
const BEFORE = -1
const AFTER = 1

const caseMetaSchema = z.object({ title: z.string(), language: z.string().optional() })

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

const inVariantOrder = (one: TitledCaseFolder, two: TitledCaseFolder): number =>
  inCodeOrder(one.meta.language ?? "", two.meta.language ?? "") || inCodeOrder(one.folder.kind, two.folder.kind)

const listFolderNames = async (path: string): Promise<string[]> => {
  try {
    return (await getAllFixtureCases(path)).filter((name) => FOLDER_NAME_PATTERN.test(name))
  } catch (error) {
    if (isMissingFile(error)) return []
    throw error
  }
}

const readMeta = async (folderPath: string): Promise<CaseMeta | null> => {
  const text = await readTextOrNull(join(folderPath, META_FILE))
  if (text === null) return null
  const parsed: unknown = JSON.parse(text)
  return caseMetaSchema.parse(parsed)
}

const titledCaseFolderOf = async (folder: CaseFolder): Promise<TitledCaseFolder | null> => {
  const [meta, snapshotNames] = await Promise.all([readMeta(join(folder.casesPath, folder.kind)), listSnapshotNames(folder.casesPath, folder.kind)])
  const snapshotName = snapshotNames.at(0) ?? null
  return meta === null || snapshotName === null ? null : { folder, meta, snapshotName }
}

const isTitled = (titled: TitledCaseFolder | null): titled is TitledCaseFolder => titled !== null

const listVariantFolders = async (playgroundId: string, groupPath: string): Promise<TitledCaseFolder[]> => {
  const variants = await listFolderNames(groupPath)
  const titled = await Promise.all(variants.map(async (variant) =>
    await titledCaseFolderOf({ id: [playgroundId, variant].join(ID_SEPARATOR), casesPath: groupPath, kind: variant })))
  return titled.filter(isTitled).sort(inVariantOrder)
}

const listCaseFolders = async (playgroundsPath: string, name: PlaygroundName): Promise<TitledCaseFolder[]> => {
  const id = playgroundIdOf(name)
  const languagePath = join(playgroundsPath, name.language)
  const own = await titledCaseFolderOf({ id, casesPath: languagePath, kind: name.framework })
  return own === null ? await listVariantFolders(id, join(languagePath, name.framework)) : [own]
}

const readPlaygroundEntry = async (playgroundsPath: string, name: PlaygroundName): Promise<PlaygroundEntry | null> => {
  const [meta, caseFolders] = await Promise.all([readMeta(join(playgroundsPath, name.language, name.framework)), listCaseFolders(playgroundsPath, name)])
  if (meta === null || caseFolders.length === 0) return null
  return { id: playgroundIdOf(name), ...name, title: meta.title }
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

const readPlaygroundCase = async ({ folder, meta, snapshotName }: TitledCaseFolder): Promise<PlaygroundCase | null> => {
  const [snapshot, artifact] = await Promise.all([
    readTraceSnapshot(folder.casesPath, folder.kind, snapshotName),
    readCaseArtifact(folder.casesPath, folder.kind, snapshotName),
  ])
  return snapshot === null || artifact === null ? null : { id: folder.id, title: meta.title, caseTitle: snapshot.title, artifact }
}

export const readPlayground = async (id: string, playgroundsPath: string = PLAYGROUNDS_FOLDER): Promise<readonly PlaygroundCase[] | null> => {
  const name = parsePlaygroundId(id)
  if (name === null) return null
  const caseFolders = await listCaseFolders(playgroundsPath, name)
  const cases = (await Promise.all(caseFolders.map(readPlaygroundCase))).filter((playgroundCase): playgroundCase is PlaygroundCase => playgroundCase !== null)
  return cases.length === 0 ? null : cases
}
