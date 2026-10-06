import { readdir, readFile } from "node:fs/promises"
import { join, relative, sep } from "node:path"
import type { RepositoryFiles } from "./apply-diffs"

const PATH_SEPARATOR = "/"

export const readRepositoryFiles = async (repoPath: string): Promise<RepositoryFiles> => {
  const entries = await readdir(repoPath, { recursive: true, withFileTypes: true })
  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map(async (entry): Promise<readonly [string, string]> => {
        const filePath = join(entry.parentPath, entry.name)
        return [relative(repoPath, filePath).split(sep).join(PATH_SEPARATOR), await readFile(filePath, "utf8")]
      }),
  )
  return new Map(files)
}
