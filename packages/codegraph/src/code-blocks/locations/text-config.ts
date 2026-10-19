import { parse as parseToml } from "smol-toml"
import { holdsPlainSection, readPlainValues, type ConfigValues, type PathSegment } from "./key-paths"

const LINE_BREAK_PATTERN = /\r?\n/
const SECTION_PATTERN = /^\s*\[(?<name>[^\]]+)\]\s*$/
const ENTRY_PATTERN = /^(?<key>[^=:\s][^=:]*?)\s*[=:]\s*(?<value>.*)$/
const INDENTED_PATTERN = /^\s+\S/
const INI_COMMENT_PATTERN = /^\s*[;#]/
const LINE_COMMENT_PATTERN = /^\s*#/
const YAML_ENTRY_PATTERN = /^(?<indent>\s*)(?<key>[^\s:#-][^:#]*?)\s*:\s*(?<value>[^#]*?)\s*(?:#.*)?$/
const YAML_ITEM_PATTERN = /^(?<indent>\s*)-\s+(?<value>[^#]*?)\s*(?:#.*)?$/
const QUOTES_PATTERN = /^(["'])(?<text>.*)\1$/
const CONTINUATION_SEPARATOR = "\n"

const parsedOrNothing = (parse: () => unknown): unknown => {
  try {
    return parse()
  } catch {
    return null
  }
}

const withoutJsonComments = (text: string): string =>
  text.replace(/"(?:[^"\\]|\\.)*"|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (found) => (found.startsWith("\"") ? found : ""))

export const readJsonData = (text: string): unknown => parsedOrNothing(() => JSON.parse(withoutJsonComments(text)))

export const readTomlData = (text: string): unknown => parsedOrNothing(() => parseToml(text))

interface IniState {
  readonly section: string | null
  readonly key: string | null
  readonly sections: Readonly<Record<string, Readonly<Record<string, string>>>>
}

const withEntry = (state: IniState, section: string, key: string, value: string): IniState => ({
  ...state,
  key,
  sections: { ...state.sections, [section]: { ...state.sections[section], [key]: value } },
})

const readIniLine = (state: IniState, line: string): IniState => {
  if (INI_COMMENT_PATTERN.test(line) || line.trim() === "") return state
  const section = SECTION_PATTERN.exec(line)?.groups?.name
  if (section !== undefined) return { ...state, section: section.trim(), key: null }
  if (state.section === null) return state
  if (INDENTED_PATTERN.test(line) && state.key !== null) {
    const written = state.sections[state.section][state.key]
    return withEntry(state, state.section, state.key, `${written}${CONTINUATION_SEPARATOR}${line.trim()}`)
  }
  const entry = ENTRY_PATTERN.exec(line)?.groups
  return entry === undefined ? state : withEntry(state, state.section, entry.key.trim(), entry.value.trim())
}

const TOP_SECTION = ""

export const readIniData = (text: string): unknown => {
  const { sections } = text.split(LINE_BREAK_PATTERN).reduce(readIniLine, { section: TOP_SECTION, key: null, sections: {} })
  const { [TOP_SECTION]: top, ...named } = sections
  return { ...top, ...named }
}

const unquoted = (text: string): string => QUOTES_PATTERN.exec(text)?.groups?.text ?? text

interface YamlLine {
  readonly indent: number
  readonly key: string | null
  readonly value: string | null
}

const yamlLineOf = (line: string): YamlLine[] => {
  if (line.trim() === "" || LINE_COMMENT_PATTERN.test(line)) return []
  const item = YAML_ITEM_PATTERN.exec(line)?.groups
  if (item !== undefined) return [{ indent: item.indent.length, key: null, value: unquoted(item.value) }]
  const entry = YAML_ENTRY_PATTERN.exec(line)?.groups
  if (entry === undefined) return []
  const value = entry.value === "" ? null : unquoted(entry.value)
  return [{ indent: entry.indent.length, key: unquoted(entry.key), value }]
}

const isBelow = (line: YamlLine, indent: number): boolean => line.indent > indent

const takeBlock = (lines: readonly YamlLine[], indent: number): readonly YamlLine[] => {
  const end = lines.findIndex((line) => !isBelow(line, indent))
  return end === -1 ? lines : lines.slice(0, end)
}

const yamlValueOf = (lines: readonly YamlLine[]): unknown => {
  if (lines.length === 0) return null
  if (lines[0].key === null) return lines.filter((line) => line.key === null && line.indent === lines[0].indent).map((line) => line.value)
  return yamlMapOf(lines)
}

const yamlMapOf = (lines: readonly YamlLine[]): Readonly<Record<string, unknown>> => {
  if (lines.length === 0) return {}
  const [first, ...rest] = lines
  const block = takeBlock(rest, first.indent)
  const following = rest.slice(block.length)
  const value = first.value ?? yamlValueOf(block)
  return first.key === null ? yamlMapOf(following) : { [first.key]: value, ...yamlMapOf(following) }
}

export const readYamlData = (text: string): unknown => yamlMapOf(text.split(LINE_BREAK_PATTERN).flatMap(yamlLineOf))

export const readDataValues = (data: unknown, segments: readonly PathSegment[]): ConfigValues => readPlainValues(data, segments)

export const holdsDataSection = (data: unknown, segments: readonly PathSegment[]): boolean => holdsPlainSection(data, segments)
