import { parse, stringify } from "devalue"
import { completeImport } from "@/procedures/complete-import"
import type { ProcedureContext } from "@/procedures/context"
import { createConversationContext, KEY } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { getImportForm } from "@/procedures/get-import-form"
import { WEBHOOK_RETRY_ARTIFACT } from "@/procedures/get-review/utils/mocks/webhook-retry-artifact"
import { formatStoredReview, type ReviewScaffold } from "@/procedures/get-review/utils/stored-review"
import { importReview } from "@/procedures/import-review"
import { InMemoryImportFileStore } from "@/procedures/import-review/utils/import-file-store"

const URL = "https://claude.ai/artifact/abc"
const INPUT = { ...KEY, artifactUrl: URL }

const SCAFFOLD: ReviewScaffold = {
  artifact: { ...WEBHOOK_RETRY_ARTIFACT, status: "complete" },
  baseCommit: "0000000",
  request: { configurationId: "standard", preset: "standard", order: "risk-first", customOrder: null, writer: { kind: "none" }, requestedAt: new Date("2026-10-01T12:00:00.000Z") },
}

interface ImportTestContext {
  readonly context: ProcedureContext
  readonly importFiles: InMemoryImportFileStore
}

const createContext = (): ImportTestContext => {
  const importFiles = new InMemoryImportFileStore()
  return { context: { ...createConversationContext().context, importFiles }, importFiles }
}

describe("completeImport", () => {
  it("stores the fetched file as the review target's Flight Plan, finishes the import and removes the file", async () => {
    const { context, importFiles } = createContext()
    await importReview(INPUT, context)
    importFiles.write(KEY, formatStoredReview(SCAFFOLD, null))

    await expect(completeImport(KEY, context)).resolves.toMatchObject({ kind: "imported" })

    await expect(context.reviewStore.findArtifact(KEY)).resolves.toStrictEqual(SCAFFOLD.artifact)
    await expect(getImportForm(INPUT, context)).resolves.toMatchObject({ isFinished: true, isImporting: false })
    await expect(importFiles.read(KEY)).resolves.toBeNull()
  })

  it("stores nothing when the reviewer asked for no import", async () => {
    const { context, importFiles } = createContext()
    importFiles.write(KEY, formatStoredReview(SCAFFOLD, null))

    await expect(completeImport(KEY, context)).resolves.toMatchObject({ kind: "rejected" })
    await expect(context.reviewStore.findArtifact(KEY)).resolves.toBeNull()
  })

  it("says where the file is expected when it is not there yet", async () => {
    const { context } = createContext()
    await importReview(INPUT, context)

    await expect(completeImport(KEY, context)).resolves.toStrictEqual({
      kind: "rejected",
      message: "There is no file at /sample-imports/storefront/pr-412.json yet. Copy the Flight Plan there, then call record-import again.",
    })
  })

  it("stores a Flight Plan of a newer Flight Plan as it came, for the reviewer to convert when they open it", async () => {
    const { context, importFiles } = createContext()
    await importReview(INPUT, context)
    const stored: unknown = parse(formatStoredReview(SCAFFOLD, "0.9.0"))
    const newer = stringify(typeof stored === "object" && stored !== null ? { ...stored, owner: "A field of a newer Flight Plan" } : stored)
    importFiles.write(KEY, newer)

    await expect(completeImport(KEY, { ...context, runningVersion: "0.1.11" })).resolves.toMatchObject({ kind: "imported" })

    await expect(context.reviewStore.readStoredText(KEY)).resolves.toBe(newer)
  })

  it("refuses a file that is not a Flight Plan", async () => {
    const { context, importFiles } = createContext()
    await importReview(INPUT, context)
    importFiles.write(KEY, "{\"not\":\"a Flight Plan\"}")

    await expect(completeImport(KEY, context)).resolves.toMatchObject({ kind: "rejected" })
    await expect(context.reviewStore.findArtifact(KEY)).resolves.toBeNull()
  })
})
