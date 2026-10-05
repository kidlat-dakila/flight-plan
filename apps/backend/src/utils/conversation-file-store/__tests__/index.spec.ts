import { readFile, writeFile, mkdir } from "node:fs/promises"
import { join } from "node:path"
import { reviewerMessage } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { FileConversationStore, toFileName } from "@/utils/conversation-file-store"
import { withTemporaryFolder } from "@/utils/text-file/__tests__/temporary-folder"

const KEY = { repositoryName: "storefront", targetId: "pr-412" }
const BRANCH_KEY = { repositoryName: "storefront", targetId: "branch-feature/web" }

describe("toFileName", () => {
  it("percent-encodes everything but letters, digits, dash, underscore and dot", () => {
    expect(toFileName("branch-feature/web")).toBe("branch-feature%2Fweb")
    expect(toFileName("a b!")).toBe("a%20b%21")
    expect(toFileName("..")).toBe("%2E%2E")
  })
})

describe("FileConversationStore", () => {
  it("reads an empty conversation for a target that has none", async () => {
    await withTemporaryFolder(async (folder) => {
      await expect(new FileConversationStore(folder).read(KEY)).resolves.toStrictEqual({ sessionId: null, journal: [] })
    })
  })

  it("keeps each target's conversation in its own file, a branch with a slash included", async () => {
    await withTemporaryFolder(async (folder) => {
      const store = new FileConversationStore(folder)

      await store.append(BRANCH_KEY, [reviewerMessage("m1", "Hi")])

      const stored: unknown = JSON.parse(await readFile(join(folder, "conversations", "storefront", "branch-feature%2Fweb.json"), "utf8"))
      expect(stored).toMatchObject({ schema: 1, sessionId: null, journal: [{ sequence: 1, event: { kind: "reviewer-message", id: "m1" } }] })
      await expect(new FileConversationStore(folder).read(BRANCH_KEY)).resolves.toMatchObject({ journal: [{ sequence: 1 }] })
    })
  })

  it("numbers appends that arrive together one after the other", async () => {
    await withTemporaryFolder(async (folder) => {
      const store = new FileConversationStore(folder)

      const appended = await Promise.all(["m1", "m2", "m3"].map(async (id) => await store.append(KEY, [reviewerMessage(id, id)])))

      expect(new Set(appended.flat().map((entry) => entry.sequence))).toStrictEqual(new Set([1, 2, 3]))
      await expect(store.read(KEY)).resolves.toMatchObject({ journal: [{ sequence: 1 }, { sequence: 2 }, { sequence: 3 }] })
    })
  })

  it("finds the review target a saved session belongs to", async () => {
    await withTemporaryFolder(async (folder) => {
      const store = new FileConversationStore(folder)
      await store.saveSessionId(KEY, "session-a")
      await store.saveSessionId(BRANCH_KEY, "session-b")

      await expect(store.findKeyBySessionId("session-b")).resolves.toStrictEqual(BRANCH_KEY)
      await expect(store.findKeyBySessionId("missing")).resolves.toBeNull()
    })
  })

  it("refuses to read a conversation file it cannot understand", async () => {
    await withTemporaryFolder(async (folder) => {
      await mkdir(join(folder, "conversations", "storefront"), { recursive: true })
      await writeFile(join(folder, "conversations", "storefront", "pr-412.json"), "{ broken")

      await expect(new FileConversationStore(folder).read(KEY)).rejects.toThrow("A saved conversation cannot be read.")
    })
  })
})
