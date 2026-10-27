import * as path from "node:path"
import { fitsGlob } from "@/catalogue/matching/file-patterns"
import type { CatalogueLibrary, ConfigFile, LocationHolds, LocationKey, LocationSetting, ScriptFlag } from "@/catalogue/types"
import { isUsed } from "@/code-blocks/languages/file-catalogue"
import type { PackageManifest } from "@/code-blocks/manifests"
import type { CodeBlockClassification } from "@/code-blocks/types"
import { Memo } from "@/shared/memo"
import { readConfig, type ConfigReader } from "./config-values"
import { splitWords } from "./key-paths"
import { listFlagValues } from "./script-flags"

export interface LocationRule {
  readonly classification: CodeBlockClassification
  readonly glob: string | null
  readonly regex: string | null
  readonly folder: string
  readonly excludedFolders: readonly string[]
}

export interface RepositoryLocations {
  readonly rules: readonly LocationRule[]
}

export interface RepositoryConfiguration {
  readonly manifests: readonly PackageManifest[]
  readonly configTextByPath: ReadonlyMap<string, string>
  readonly libraries: readonly CatalogueLibrary[]
}

interface FoundConfig {
  readonly filePath: string
  readonly file: ConfigFile
  readonly reader: ConfigReader
}

interface Scoped {
  readonly folder: string
  readonly excludedFolders: readonly string[]
}

export const NO_LOCATIONS: RepositoryLocations = { rules: [] }

const ROOT = ""
const FOLDER_SEPARATOR = "/"
const PARENT_FOLDER = ".."
const SAME_FOLDER = "."
const EVERYTHING_BELOW = "**"
const PUBLIC_FOLDER = "public"
const MODULE_SEPARATOR = "."
const KEY_SEPARATOR = "."
const TEST: CodeBlockClassification = "test"
const GLOB_CHARACTERS = /[*?[{(]/
const ROOT_TOKENS = /^(?:<rootDir>|%\(here\)s)\/?/
const LEADING_CURRENT = /^\.\//
const LEADING_ROOT = /^\/+/
const TEMPLATE_TOKENS = /\{\{[^}]*\}\}|\{\w+\}/g
const PATH_GLOB_CHARACTERS = /[*?[{]/
const EXTENSION_PATTERN = /\.[^./]+$/
const ANY_NAME = "*"
const UNSPLIT_HOLDS: ReadonlySet<LocationHolds> = new Set<LocationHolds>(["regex", "url-globs"])

const isWithin = (folder: string, filePath: string): boolean => folder === ROOT || filePath === folder || filePath.startsWith(`${folder}${FOLDER_SEPARATOR}`)

const relativeTo = (folder: string, filePath: string): string => (folder === ROOT ? filePath : filePath.slice(folder.length + FOLDER_SEPARATOR.length))

const folderOf = (filePath: string): string => {
  const folder = path.posix.dirname(filePath)
  return folder === SAME_FOLDER ? ROOT : folder
}

const levelsAbove = (folder: string, levels: number): string => (levels <= 0 || folder === ROOT ? folder : levelsAbove(folderOf(folder), levels - 1))

const joinPath = (...parts: readonly string[]): string | null => {
  const written = parts.filter((part) => part !== ROOT)
  if (written.length === 0) return ROOT
  const joined = path.posix.normalize(path.posix.join(...written))
  if (joined === SAME_FOLDER) return ROOT
  return joined === PARENT_FOLDER || joined.startsWith(`${PARENT_FOLDER}${FOLDER_SEPARATOR}`) ? null : joined
}

const lastSegmentOf = (glob: string): string => glob.slice(glob.lastIndexOf(FOLDER_SEPARATOR) + 1)

const cleanValue = (value: string): string =>
  value.replace(ROOT_TOKENS, "").replace(LEADING_CURRENT, "").replace(LEADING_ROOT, "").replace(TEMPLATE_TOKENS, ANY_NAME)

const isFolderPath = (value: string): boolean => !PATH_GLOB_CHARACTERS.test(value) && !EXTENSION_PATTERN.test(lastSegmentOf(value))

const fitsName = (glob: string, fileName: string): boolean => {
  const last = lastSegmentOf(glob)
  return GLOB_CHARACTERS.test(last) ? fitsGlob(last, fileName) : last === fileName
}

const suffixesOf = (filePath: string): string[] => filePath.split(FOLDER_SEPARATOR).map((_, index, parts) => parts.slice(index).join(FOLDER_SEPARATOR))

const listConfigFiles = (libraries: readonly CatalogueLibrary[]): ConfigFile[] =>
  libraries.flatMap((library) => (library.locations ?? []).flatMap((setting) => setting.files))

const fitsConfigGlob = (glob: string, filePath: string): boolean =>
  fitsName(glob, lastSegmentOf(filePath)) && suffixesOf(filePath).some((suffix) => fitsGlob(glob, suffix))

export const listConfigPaths = (filePaths: readonly string[], libraries: readonly CatalogueLibrary[]): string[] => {
  const globs = [...new Set(listConfigFiles(libraries).map((file) => file.glob))]
  return filePaths.filter((filePath) => globs.some((glob) => fitsConfigGlob(glob, filePath)))
}

interface NamingFile {
  readonly glob: string
  readonly flag: ScriptFlag
}

const namingFileOf = ({ glob, namedBy }: ConfigFile): NamingFile[] => (namedBy === undefined ? [] : [{ glob, flag: namedBy }])

const pathsNamedBy = (namingPath: string, reader: ConfigReader, flag: ScriptFlag): string[] =>
  (reader.valuesAt(flag.scripts) ?? []).flatMap((script) => listFlagValues(script, flag).flatMap((value) => joinPath(folderOf(namingPath), value) ?? []))

export const listScriptConfigPaths = (
  filePaths: readonly string[],
  configTextByPath: ReadonlyMap<string, string>,
  libraries: readonly CatalogueLibrary[],
): string[] => {
  const namingFiles = listConfigFiles(libraries).flatMap(namingFileOf)
  const held = new Set(filePaths)
  const named = [...configTextByPath].flatMap(([filePath, text]) => {
    const fitting = namingFiles.filter(({ glob }) => fitsConfigGlob(glob, filePath))
    if (fitting.length === 0) return []
    const reader = readConfig(filePath, text)
    return fitting.flatMap(({ flag }) => pathsNamedBy(filePath, reader, flag))
  })
  return [...new Set(named)].filter((filePath) => held.has(filePath) && !configTextByPath.has(filePath))
}

const evaluationFoldersOf = (library: CatalogueLibrary, manifests: readonly PackageManifest[]): string[] => {
  if (library.specifiers.length === 0) return [ROOT]
  const installed = manifests.filter((manifest) => isUsed(library, manifest)).map((manifest) => manifest.folder)
  const nested = manifests.map((manifest) => manifest.folder).filter((folder) => installed.some((installer) => isWithin(installer, folder)))
  return [...new Set([...installed, ...nested])].sort()
}

const keyPathOf = (file: ConfigFile, key: string): string => (file.under === undefined ? key : `${file.under}${KEY_SEPARATOR}${key}`)

const findConfigs = (setting: LocationSetting, folder: string, readerByPath: ReadonlyMap<string, ConfigReader>): FoundConfig[] =>
  [...readerByPath].flatMap(([filePath, reader]) => {
    if (!isWithin(folder, filePath)) return []
    const relative = relativeTo(folder, filePath)
    const file = setting.files.find(
      (candidate) => candidate.namedBy === undefined && fitsGlob(candidate.glob, relative) && (candidate.under === undefined || reader.holdsSection(candidate.under)),
    )
    return file === undefined ? [] : [{ filePath, file, reader }]
  })

const findScriptConfigsOf = (file: ConfigFile, flag: ScriptFlag, folder: string, readerByPath: ReadonlyMap<string, ConfigReader>): FoundConfig[] =>
  [...readerByPath]
    .filter(([namingPath]) => isWithin(folder, namingPath) && fitsGlob(file.glob, relativeTo(folder, namingPath)))
    .flatMap(([namingPath, namingReader]) =>
      pathsNamedBy(namingPath, namingReader, flag).flatMap((filePath) => {
        const reader = readerByPath.get(filePath)
        return reader === undefined ? [] : [{ filePath, file, reader }]
      }))

const findScriptConfigs = (setting: LocationSetting, folder: string, readerByPath: ReadonlyMap<string, ConfigReader>): FoundConfig[] =>
  setting.files.flatMap((file) => (file.namedBy === undefined ? [] : findScriptConfigsOf(file, file.namedBy, folder, readerByPath)))

const baseOf = ({ filePath, file }: FoundConfig, folder: string): string =>
  file.base === "package" ? folder : levelsAbove(folderOf(filePath), file.levelsUp ?? 0)

const CLASS_NAME_PATTERN = /^[A-Z]/
const CLASS_AND_ITS_MODULE = 2

const folderOfModule = (modulePath: string): string => {
  const names = modulePath.split(MODULE_SEPARATOR)
  const isClass = names.length > 1 && CLASS_NAME_PATTERN.test(names[names.length - 1])
  return (isClass ? names.slice(0, names.length - CLASS_AND_ITS_MODULE) : names).join(FOLDER_SEPARATOR)
}

const resolveValue = (holds: LocationHolds, value: string, folder: string, below: string | undefined): string | null => {
  const cleaned = cleanValue(value)
  if (holds === "folders") return joinPath(folder, cleaned, below ?? EVERYTHING_BELOW)
  if (holds === "names") return joinPath(folder, EVERYTHING_BELOW, cleaned)
  if (holds === "file-folders") return joinPath(folder, folderOf(cleaned), below ?? EVERYTHING_BELOW)
  if (holds === "modules") return joinPath(folder, folderOfModule(cleaned), below ?? EVERYTHING_BELOW)
  if (holds === "url-globs") return joinPath(folder, PUBLIC_FOLDER, cleaned)
  if (holds === "paths" && isFolderPath(cleaned)) return joinPath(folder, cleaned, below ?? EVERYTHING_BELOW)
  return joinPath(folder, cleaned)
}

const separatedOf = (key: LocationKey, values: readonly string[]): string[] =>
  key.separator === undefined ? [...values] : values.flatMap((value) => value.split(key.separator ?? "").map((part) => part.trim()).filter((part) => part !== ""))

const wordsOf = (key: LocationKey, values: readonly string[]): string[] => {
  const separated = separatedOf(key, values)
  return UNSPLIT_HOLDS.has(key.holds) ? separated : separated.flatMap(splitWords)
}

interface KeyReading {
  readonly values: ReadonlyMap<string, readonly string[] | null>
  readonly sections: ReadonlySet<string>
}

interface KeyValues {
  readonly values: readonly string[]
  readonly isDefault: boolean
}

const NO_VALUES: KeyValues = { values: [], isDefault: false }

const valuesOfKey = (key: LocationKey, { values, sections }: KeyReading): KeyValues => {
  const written = values.get(key.key) ?? null
  if (written !== null) return { values: wordsOf(key, written), isDefault: false }
  const isReplaced = [key.unlessRead ?? []].flat().some((givenWayTo) => (values.get(givenWayTo) ?? null) !== null)
  const isUnconfigured = key.defaultWhen !== undefined && !sections.has(key.defaultWhen)
  return isReplaced || isUnconfigured ? NO_VALUES : { values: key.default ?? [], isDefault: true }
}

interface Bases {
  readonly base: string
  readonly packageFolder: string
}

const ruleOf = (classification: CodeBlockClassification, scoped: Scoped, key: LocationKey, resolved: string): LocationRule =>
  key.holds === "regex"
    ? { classification, glob: null, regex: resolved, ...scoped }
    : { classification, glob: resolved, regex: null, ...scoped }

const foldersOfKey = (key: LocationKey, read: KeyValues, folders: readonly string[], { packageFolder }: Bases): readonly string[] =>
  read.isDefault && key.defaultBase === "package" ? [packageFolder] : folders

const foldersOfKeys = (keys: readonly LocationKey[], read: KeyReading, base: string): string[] =>
  keys.flatMap((key) => valuesOfKey(key, read).values.flatMap((value) => joinPath(base, cleanValue(value)) ?? []))

const isPlacingKey = (key: LocationKey): boolean => key.isScope !== true && key.isBase !== true

const rulesOfKeys = (setting: LocationSetting, read: KeyReading, written: Bases, scoped: Scoped): LocationRule[] => {
  const [movedBase = written.base] = foldersOfKeys(setting.keys.filter((key) => key.isBase === true), read, written.base)
  const bases = { ...written, base: movedBase }
  const scopes = foldersOfKeys(setting.keys.filter((key) => key.isScope === true), read, bases.base)
  const folders = scopes.length === 0 ? [bases.base] : scopes
  return setting.keys
    .filter(isPlacingKey)
    .flatMap((key) => {
      const keyValues = valuesOfKey(key, read)
      return foldersOfKey(key, keyValues, folders, bases).flatMap((folder) =>
        keyValues.values.flatMap((value) => {
          if (key.holds === "regex") return [ruleOf(setting.classification, { ...scoped, folder }, key, value)]
          const resolved = resolveValue(key.holds, value, folder, key.below)
          return resolved === null ? [] : [ruleOf(setting.classification, scoped, key, resolved)]
        }))
    })
}

const readKeys = (setting: LocationSetting, config: FoundConfig | null): KeyReading => ({
  values: new Map(setting.keys.map((key) => [key.key, config === null ? null : config.reader.valuesAt(keyPathOf(config.file, key.key))] as const)),
  sections: new Set(
    setting.keys.flatMap(({ defaultWhen }) =>
      defaultWhen !== undefined && config?.reader.holdsSection(keyPathOf(config.file, defaultWhen)) === true ? [defaultWhen] : []),
  ),
})

const markedRuleOf = (setting: LocationSetting, { filePath }: FoundConfig): LocationRule[] => {
  const glob = setting.marks === "folder" ? joinPath(folderOf(filePath), EVERYTHING_BELOW) : filePath
  return glob === null ? [] : [{ classification: setting.classification, glob, regex: null, folder: ROOT, excludedFolders: [] }]
}

const rulesOfConfig = (setting: LocationSetting, config: FoundConfig, folder: string): LocationRule[] => {
  if (setting.marks !== undefined) return markedRuleOf(setting, config)
  return rulesOfKeys(setting, readKeys(setting, config), { base: baseOf(config, folder), packageFolder: folder }, { folder: ROOT, excludedFolders: [] })
}

interface FolderConfigs {
  readonly folder: string
  readonly configs: readonly FoundConfig[]
}

const rulesOfOwnConfigs = (setting: LocationSetting, { folder, configs }: FolderConfigs, configured: readonly string[]): LocationRule[] => {
  if (configs.length > 0) return configs.flatMap((config) => rulesOfConfig(setting, config, folder))
  if (setting.marks !== undefined) return []
  const excludedFolders = configured.filter((other) => other !== folder && isWithin(folder, other))
  return rulesOfKeys(setting, readKeys(setting, null), { base: folder, packageFolder: folder }, { folder, excludedFolders })
}

const rulesOfSetting = (setting: LocationSetting, folders: readonly string[], readerByPath: ReadonlyMap<string, ConfigReader>): LocationRule[] => {
  const found = folders.map((folder) => ({ folder, configs: findConfigs(setting, folder, readerByPath) }))
  const configured = found.filter(({ configs }) => configs.length > 0).map(({ folder }) => folder)
  return found.flatMap((own) => [
    ...rulesOfOwnConfigs(setting, own, configured),
    ...findScriptConfigs(setting, own.folder, readerByPath).flatMap((config) => rulesOfConfig(setting, config, own.folder)),
  ])
}

const ruleKeyOf = (rule: LocationRule): string => JSON.stringify(rule)

export const readRepositoryLocations = ({ manifests, configTextByPath, libraries }: RepositoryConfiguration): RepositoryLocations => {
  const readerByPath = new Map([...configTextByPath].map(([filePath, text]) => [filePath, readConfig(filePath, text)] as const))
  const rules = libraries.flatMap((library) => {
    const folders = evaluationFoldersOf(library, manifests)
    return (library.locations ?? []).flatMap((setting) => rulesOfSetting(setting, folders, readerByPath))
  })
  return { rules: [...new Map(rules.map((rule) => [ruleKeyOf(rule), rule] as const)).values()] }
}

const expressions = new Memo<string, RegExp | null>()

const expressionOf = (regex: string): RegExp | null =>
  expressions.remember(regex, () => {
    try {
      return new RegExp(regex)
    } catch {
      return null
    }
  })

const fitsRule = (rule: LocationRule, filePath: string): boolean => {
  if (!isWithin(rule.folder, filePath) || rule.excludedFolders.some((folder) => isWithin(folder, filePath))) return false
  if (rule.glob !== null) return fitsGlob(rule.glob, filePath)
  const expression = rule.regex === null ? null : expressionOf(rule.regex)
  return expression?.test(`${FOLDER_SEPARATOR}${relativeTo(rule.folder, filePath)}`) === true
}

export const placedClassificationsOf = (filePath: string, { rules }: RepositoryLocations): CodeBlockClassification[] => [
  ...new Set(rules.filter((rule) => fitsRule(rule, filePath)).map((rule) => rule.classification)),
]

export const isTestPath = (filePath: string, locations: RepositoryLocations): boolean => placedClassificationsOf(filePath, locations).includes(TEST)
