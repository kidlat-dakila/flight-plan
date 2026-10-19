import { LIBRARIES } from "@/code-blocks/libraries"
import { listConfigPaths, placedClassificationsOf, readRepositoryLocations, type RepositoryLocations } from "@/code-blocks/locations"
import { isManifestPath, readManifest } from "@/code-blocks/manifests"
import type { CodeBlockClassification } from "@/code-blocks/types"

export type RepositoryFiles = Readonly<Record<string, string>>

export const codeOf = (...lines: readonly string[]): string => lines.join("\n")

export const manifestWith = (...packages: readonly string[]): string =>
  JSON.stringify({ devDependencies: Object.fromEntries(packages.map((name) => [name, "1.0.0"] as const)) })

export const requirementsWith = (...packages: readonly string[]): string => packages.join("\n")

export const locationsOf = (files: RepositoryFiles): RepositoryLocations => {
  const filePaths = Object.keys(files)
  const manifests = filePaths.filter(isManifestPath).map((manifestPath) => readManifest(manifestPath, files[manifestPath]))
  const configTextByPath = new Map(listConfigPaths(filePaths, LIBRARIES).map((configPath) => [configPath, files[configPath]] as const))
  return readRepositoryLocations({ manifests, configTextByPath, libraries: LIBRARIES })
}

export const pathsPlacedAs = (files: RepositoryFiles, classification: CodeBlockClassification, candidates: readonly string[]): string[] => {
  const locations = locationsOf(files)
  return candidates.filter((filePath) => placedClassificationsOf(filePath, locations).includes(classification))
}
