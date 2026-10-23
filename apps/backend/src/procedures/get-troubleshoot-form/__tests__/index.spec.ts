import { WITH_CLAUDE } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { EMPTY_SETUP, type Setup } from "@/procedures/get-setup/utils/setup"
import { InMemorySetupStore } from "@/procedures/get-setup/utils/setup-store"
import { getTroubleshootForm } from "@/procedures/get-troubleshoot-form"
import { createTestErrorLog, errorEntryOf } from "@/procedures/record-error/utils/__tests__/error-log-fixture"

const LOGGED_ID = "20261023-142000-000009"

const contextOf = (setup: Setup = WITH_CLAUDE) => ({
  errorLog: createTestErrorLog([errorEntryOf(LOGGED_ID, "The token for github.com was refused.")]).errorLog,
  setupStore: new InMemorySetupStore(setup),
})

describe("getTroubleshootForm", () => {
  it("shows the logged error and asks what the user was doing, as an option", async () => {
    await expect(getTroubleshootForm({ errorLogId: LOGGED_ID, shownError: "Something failed." }, contextOf())).resolves.toStrictEqual({
      title: "Troubleshoot",
      intro: "Flight Plan will launch Claude in a terminal to troubleshoot this error. Claude reads the error and Flight Plan's docs, then suggests a fix.",
      error: { label: "The error", message: "The token for github.com was refused." },
      description: { label: "What were you doing when it happened?", placeholder: "Optional. A sentence or two helps.", isRequired: false },
      privacyNote: "The logs stay on this computer. If Claude finds a bug in Flight Plan, it asks you before anything is posted, and it never posts your code or your personal details.",
      problem: null,
      launchLabel: "Launch Claude",
      cancelLabel: "Cancel",
      closeLabel: "Close",
      manual: { label: "Run this command in a terminal", copyLabel: "Copy command", copiedMessage: "Command copied" },
    })
  })

  it("shows the error the page showed when it has no log", async () => {
    await expect(getTroubleshootForm({ errorLogId: null, shownError: "Something failed." }, contextOf())).resolves.toMatchObject({
      error: { message: "Something failed." },
      description: { isRequired: false },
    })
  })

  it("asks what went wrong when there is no error", async () => {
    await expect(getTroubleshootForm({ errorLogId: null, shownError: null }, contextOf())).resolves.toMatchObject({
      intro: "Tell Flight Plan what went wrong, and it will launch Claude in a terminal to troubleshoot it. Claude reads Flight Plan's logs and docs, then suggests a fix.",
      error: null,
      description: { label: "What went wrong?", isRequired: true },
    })
  })

  it("says Claude has to be added first when no agent can troubleshoot", async () => {
    await expect(getTroubleshootForm({ errorLogId: null, shownError: null }, contextOf(EMPTY_SETUP))).resolves.toMatchObject({
      problem: "Flight Plan can start only Claude to troubleshoot. Add Claude in Settings, under Agents, and try again.",
      launchLabel: "Launch Claude",
    })
  })
})
