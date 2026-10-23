import { createConversationContext, KEY, STARTED_AT } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { recordReviewerActivity } from "@/procedures/record-reviewer-activity"

describe("recordReviewerActivity", () => {
  it("restarts the review's idle clock", async () => {
    const { context, environment, clock } = createConversationContext()
    clock.advance(30_000)

    await expect(recordReviewerActivity(KEY, context)).resolves.toStrictEqual({ kind: "recorded" })
    expect(environment.reviewerActivity.activityOf(KEY).lastActiveAt).toStrictEqual(new Date(STARTED_AT.getTime() + 30_000))
  })

  it("rejects a repository Flight Plan does not follow", async () => {
    const { context } = createConversationContext()

    await expect(recordReviewerActivity({ repositoryName: "billing", targetId: "pr-1" }, context)).resolves.toMatchObject({ kind: "rejected" })
  })
})
