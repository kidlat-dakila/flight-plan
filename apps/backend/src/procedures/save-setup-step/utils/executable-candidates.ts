import { delimiter, join } from "node:path"

const USER_PROGRAMS_FOLDER = [".local", "bin"] as const

const searchFolders = (searchPath: string | undefined): readonly string[] =>
  (searchPath ?? "").split(delimiter).filter((folder) => folder !== "")

export const executableCandidates = (name: string, searchPath: string | undefined, homePath: string): readonly string[] =>
  [...searchFolders(searchPath), join(homePath, ...USER_PROGRAMS_FOLDER)].map((folder) => join(folder, name))
