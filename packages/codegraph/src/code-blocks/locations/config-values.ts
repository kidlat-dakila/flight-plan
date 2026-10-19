import { readJavascriptConfig } from "./javascript-config"
import { parseKeyPath, type ConfigValues, type PathSegment } from "./key-paths"
import { readPythonConfig } from "./python-config"
import { holdsDataSection, readDataValues, readIniData, readJsonData, readTomlData, readYamlData } from "./text-config"

export type { ConfigValues } from "./key-paths"

export interface ConfigReader {
  readonly valuesAt: (keyPath: string) => ConfigValues
  readonly holdsSection: (keyPath: string) => boolean
}

type ReadData = (text: string) => unknown

const DATA_FORMATS: readonly (readonly [RegExp, ReadData])[] = [
  [/\.json[c5]?$/, readJsonData],
  [/\.toml$/, readTomlData],
  [/(?:\.ini|\.cfg)$/, readIniData],
  [/(?:^|\/)\.env(?:\.[^/]*)?$/, readIniData],
  [/\.ya?ml$/, readYamlData],
]
const PYTHON_PATTERN = /\.pyi?$/

const dataReaderOf = (data: unknown): ConfigReader => ({
  valuesAt: (keyPath) => readDataValues(data, parseKeyPath(keyPath)),
  holdsSection: (keyPath) => holdsDataSection(data, parseKeyPath(keyPath)),
})

interface CodeConfig {
  readonly valuesAt: (segments: readonly PathSegment[]) => ConfigValues
  readonly holdsSection: (segments: readonly PathSegment[]) => boolean
}

const codeReaderOf = (config: CodeConfig): ConfigReader => ({
  valuesAt: (keyPath) => config.valuesAt(parseKeyPath(keyPath)),
  holdsSection: (keyPath) => config.holdsSection(parseKeyPath(keyPath)),
})

export const readConfig = (filePath: string, text: string): ConfigReader => {
  const format = DATA_FORMATS.find(([pattern]) => pattern.test(filePath))
  if (format !== undefined) return dataReaderOf(format[1](text))
  return codeReaderOf(PYTHON_PATTERN.test(filePath) ? readPythonConfig(text) : readJavascriptConfig(filePath, text))
}
