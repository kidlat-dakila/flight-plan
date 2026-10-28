import { join } from "node:path"
import { fileURLToPath } from "node:url"

export interface TraceFixtureFolders {
  readonly playground: string
  readonly lab: string
}

const LAB_PATH = fileURLToPath(new URL("../..", import.meta.url))

export const TRACE_FIXTURE_FOLDERS: TraceFixtureFolders = {
  playground: join(LAB_PATH, "..", "playground-fixtures", "test-cases"),
  lab: join(LAB_PATH, "cases"),
}

export const PLAYGROUNDS_FOLDER = join(LAB_PATH, "playgrounds")
