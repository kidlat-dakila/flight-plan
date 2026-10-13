import { createConversationContext, KEY } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { WEBHOOK_RETRY_ARTIFACT } from "@/procedures/get-review/utils/mocks/webhook-retry-artifact"
import { formatStoredReview } from "@/procedures/get-review/utils/stored-review"
import { importReview } from "@/procedures/import-review"
import { InMemoryImportFileStore } from "@/procedures/import-review/utils/import-file-store"
import { buildServer } from "@/server"

const MCP_HEADERS = { "accept": "application/json, text/event-stream", "content-type": "application/json" }

const CALL = {
  method: "POST" as const,
  url: "/mcp",
  headers: MCP_HEADERS,
  payload: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "record-import", arguments: KEY } },
}

const STORED = formatStoredReview({
  artifact: WEBHOOK_RETRY_ARTIFACT,
  baseCommit: "0000000",
  request: { preset: "standard", order: "risk-first", customOrder: null, writer: { kind: "manual" }, requestedAt: new Date("2026-10-01T12:00:00.000Z") },
})

describe("record-import tool", () => {
  it("stores the fetched Flight Plan and says the reviewer can open it", async () => {
    const importFiles = new InMemoryImportFileStore()
    const context = { ...createConversationContext().context, importFiles }
    await importReview({ ...KEY, artifactUrl: "https://claude.ai/artifact/abc" }, context)
    importFiles.write(KEY, STORED)
    const server = await buildServer({}, context)

    const response = await server.inject(CALL)

    expect(response.body).toContain("Imported.")
    expect(response.body).not.toContain("\"isError\":true")
    await expect(context.reviewStore.findArtifact(KEY)).resolves.toStrictEqual(WEBHOOK_RETRY_ARTIFACT)
    await server.close()
  })

  it("returns a rejection as an error result", async () => {
    const server = await buildServer({}, createConversationContext().context)

    const response = await server.inject(CALL)

    expect(response.body).toContain("\"isError\":true")
    await server.close()
  })
})
