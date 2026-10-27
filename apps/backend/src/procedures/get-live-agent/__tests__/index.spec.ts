import { createConversationContext, KEY } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { getLiveAgent } from "@/procedures/get-live-agent"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"

describe("getLiveAgent", () => {
  it("says whether the setup's agent is online for the review, with the dialog that starts it", async () => {
    const { context, environment } = createConversationContext()

    await expect(getLiveAgent(KEY, context)).resolves.toMatchObject({ kind: "live", isOnline: false, dialog: { terminal: null } })
    environment.presence.openStream(KEY)
    await expect(getLiveAgent(KEY, context)).resolves.toMatchObject({ kind: "live", isOnline: true })
  })

  it("offers to open a terminal where Flight Plan can", async () => {
    const { context } = createConversationContext()
    const withTerminal = { ...context, openTerminal: async () => await Promise.resolve({ kind: "opened" as const, tab: null, isWindowFallback: false }) }

    await expect(getLiveAgent(KEY, withTerminal)).resolves.toMatchObject({ dialog: { terminal: { label: "Open a terminal for me" } } })
  })

  it("has nothing to offer with no agent set up, or for a repository Flight Plan does not follow", async () => {
    await expect(getLiveAgent(KEY, createConversationContext({ setup: EMPTY_SETUP }).context)).resolves.toStrictEqual({ kind: "unavailable" })
    await expect(getLiveAgent({ repositoryName: "billing", targetId: "pr-1" }, createConversationContext().context)).resolves.toStrictEqual({ kind: "unavailable" })
  })
})
