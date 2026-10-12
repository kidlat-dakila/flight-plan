import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

const MISSING_FILE_CODE = "ENOENT"
const DRAFT_SUFFIX = ".draft"

const isMissingFile = (error: unknown): boolean =>
  error instanceof Error && "code" in error && error.code === MISSING_FILE_CODE

export const readTextOrNull = async (path: string): Promise<string | null> => {
  try {
    return await readFile(path, "utf8")
  } catch (error) {
    if (isMissingFile(error)) return null
    throw error
  }
}

export const writeText = async (path: string, text: string): Promise<void> => {
  const draftPath = `${path}${DRAFT_SUFFIX}`
  await mkdir(dirname(path), { recursive: true })
  await writeFile(draftPath, text)
  await rename(draftPath, path)
}

export const removeFile = async (path: string): Promise<void> => {
  await rm(path, { force: true })
}
