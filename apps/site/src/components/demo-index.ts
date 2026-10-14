import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { z } from "zod"

const demoEntrySchema = z.object({
  name: z.string(),
  meta: z.object({
    title: z.string(),
    language: z.string(),
    mainFramework: z.string(),
    packages: z.array(z.string()),
  }),
  pullRequestTitle: z.string(),
  story: z.object({
    repository: z.object({ name: z.string(), forgeSlug: z.string() }),
    pullRequest: z.object({ number: z.number(), author: z.string() }),
    reviewers: z.array(z.object({ login: z.string() })),
    threads: z.array(z.unknown()),
  }),
})

export type DemoEntry = z.infer<typeof demoEntrySchema>

const DEMO_INDEX_PATH = join(process.cwd(), "public/demo-data/index.json")

export const DEMO_DATA_URL = "/demo-data"
export const DEMO_APP_URL = "/demo-app"

export const readDemoEntries = async (): Promise<readonly DemoEntry[]> =>
  z.array(demoEntrySchema).parse(JSON.parse(await readFile(DEMO_INDEX_PATH, "utf8")))

export const demoHrefOf = (entry: DemoEntry): string => `/demo/${entry.name}/`
