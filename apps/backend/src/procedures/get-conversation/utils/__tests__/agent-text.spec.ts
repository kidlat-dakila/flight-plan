import { formatInbound, listenCommandOf, spawnInstructionsOf } from "@/procedures/get-conversation/utils/agent-text"
import { appendEvents, EMPTY_CONVERSATION } from "@/procedures/get-conversation/utils/conversation"
import { agentQuestion, KEY, STARTED_AT } from "./conversation-fixture"

describe("formatInbound", () => {
  it("writes the reviewer's messages and answers as text the agent reads", () => {
    const { conversation } = appendEvents(EMPTY_CONVERSATION, [
      { kind: "reviewer-message", id: "m1", body: "Is this safe?", reference: "storefront@9f2c1ab:src/x.ts#L3-9", sentAt: STARTED_AT },
      agentQuestion("q1"),
      {
        kind: "answers",
        id: "r1",
        batchId: "q1",
        origin: "agent",
        answers: [{ questionId: "q1-1", pickedLabels: ["By layer"], text: "Start with the API" }],
        answeredAt: STARTED_AT,
      },
    ])
    const inbound = conversation.journal.filter((entry) => entry.sequence !== 2)

    expect(formatInbound(inbound, conversation.journal)).toBe(
      [
        "The reviewer wrote about storefront@9f2c1ab:src/x.ts#L3-9:\nIs this safe?",
        "The reviewer answered your questions (q1):\n- How should I organise the walkthrough?\n  By layer; Start with the API",
      ].join("\n\n"),
    )
  })
})

describe("listenCommandOf", () => {
  it("encodes a branch name so the address stays one path segment", () => {
    expect(listenCommandOf("http://localhost:3000", { repositoryName: "storefront", targetId: "branch-feature/web" })).toBe(
      "curl -sN \"http://localhost:3000/api/storefront/branch-feature%2Fweb/live/agent\"",
    )
  })
})

describe("spawnInstructionsOf", () => {
  it("names the review target and tells the agent to end its turn after asking", () => {
    const instructions = spawnInstructionsOf(KEY)

    expect(instructions).toContain("repositoryName \"storefront\" and targetId \"pr-412\"")
    expect(instructions).toContain("end your turn without waiting")
  })
})
