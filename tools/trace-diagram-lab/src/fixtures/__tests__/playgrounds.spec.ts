import { mkdir, mkdtemp, rm, symlink } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { onTestFinished } from "vitest"
import { listPlaygrounds, readPlayground, readTraceFixture, TRACE_FIXTURE_FOLDERS } from "@/fixtures"
import { reviewArtifactSchema, type ReviewArtifact } from "@flightplan/configurations"

const LAB_KIND = "express-api"
const LAB_FIXTURE_ID = "lab/express-api/implement-route-patch-tasks-id-complete"
const KIND_TITLE = "Express API with an in-memory task store"
const CASE_TITLE = "Implement route PATCH /tasks/:id/complete"
const META_FILE = "meta.json"
const KIND_PARTS = ["repo", "snapshots", "code-blocks", META_FILE]
const UNTITLED_KIND_PARTS = KIND_PARTS.filter((part) => part !== META_FILE)

const sourcePathsOf = (artifact: ReviewArtifact | null): string[] => [...(artifact?.sources ?? []).map((source) => source.path)].sort()

const traceNodeIdsOf = (artifact: ReviewArtifact | null): (string[] | undefined)[] =>
  (artifact?.segments ?? []).map((segment) => segment.traceDiagram?.traceNodes.map((node) => node.id))

const createEmptyFolder = async (): Promise<string> => {
  const folder = await mkdtemp(join(tmpdir(), "playgrounds-"))
  onTestFinished(async () => {
    await rm(folder, { recursive: true, force: true })
  })
  return folder
}

const linkLabKind = async (playgrounds: string, language: string, framework: string, parts: readonly string[] = KIND_PARTS): Promise<void> => {
  const target = join(playgrounds, language, framework)
  await mkdir(target, { recursive: true })
  await Promise.all(parts.map(async (part) => {
    await symlink(join(TRACE_FIXTURE_FOLDERS.lab, LAB_KIND, part), join(target, part))
  }))
}

const createPlaygrounds = async (): Promise<string> => {
  const playgrounds = await createEmptyFolder()
  await linkLabKind(playgrounds, "typescript", "express")
  await linkLabKind(playgrounds, "typescript", "base")
  await linkLabKind(playgrounds, "python", "fastapi")
  await linkLabKind(playgrounds, "python", "base")
  await linkLabKind(playgrounds, "typescript", "untitled", UNTITLED_KIND_PARTS)
  await mkdir(join(playgrounds, "typescript", "unwritten", "repo"), { recursive: true })
  return playgrounds
}

describe("listPlaygrounds", () => {
  it("lists nothing from a missing or an empty folder", async () => {
    const playgrounds = await createEmptyFolder()

    expect(await listPlaygrounds(playgrounds)).toStrictEqual([])
    expect(await listPlaygrounds(join(playgrounds, "missing"))).toStrictEqual([])
  })

  it("lists each playground with its title and the title of its case", async () => {
    const entries = await listPlaygrounds(await createPlaygrounds())

    expect(entries).toContainEqual({ id: "typescript/express", language: "typescript", framework: "express", title: KIND_TITLE, caseTitle: CASE_TITLE })
  })

  it("lists the languages in order, each with its base first", async () => {
    const entries = await listPlaygrounds(await createPlaygrounds())

    expect(entries.map((entry) => entry.id)).toStrictEqual(["python/base", "python/fastapi", "typescript/base", "typescript/express"])
  })
})

describe("readPlayground", () => {
  it("reads a playground's case as the lab reads the same case", async () => {
    const playgrounds = await createPlaygrounds()
    const [artifact, labArtifact] = await Promise.all([readPlayground("typescript/express", playgrounds), readTraceFixture(LAB_FIXTURE_ID)])

    expect(reviewArtifactSchema.safeParse(artifact).success).toBe(true)
    expect(artifact?.title).toBe(labArtifact?.title)
    expect(sourcePathsOf(artifact)).toStrictEqual(sourcePathsOf(labArtifact))
    expect(traceNodeIdsOf(artifact)).toStrictEqual(traceNodeIdsOf(labArtifact))
  })

  it.each(["typescript/unwritten", "typescript/missing", "typescript", "typescript/express/extra", "../cases/express-api", "Typescript/express"])(
    "returns null for %s, which names no playground",
    async (id) => {
      await expect(readPlayground(id, await createPlaygrounds())).resolves.toBeNull()
    },
  )
})
