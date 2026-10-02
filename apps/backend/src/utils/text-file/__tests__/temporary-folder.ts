import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

const FOLDER_PREFIX = "flight-plan-"

export const withTemporaryFolder = async (use: (folder: string) => Promise<void>): Promise<void> => {
  const folder = await mkdtemp(join(tmpdir(), FOLDER_PREFIX))
  try {
    await use(folder)
  } finally {
    await rm(folder, { recursive: true, force: true })
  }
}
