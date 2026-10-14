import {
  demoReviewPathOf,
  toDemoAgentReplies,
  toDemoChat,
  toDemoPullRequest,
  toDemoRepository,
  type DemoReview,
  type DemoStory,
} from "@/procedures/get-review/utils/mocks/demo-reviews"
import { HELD_STOCK_ARTIFACT } from "@/procedures/get-review/utils/mocks/held-stock"

const NOW = new Date("2026-10-14T12:00:00.000Z")
const MINUTE_MS = 60_000

const STORY: DemoStory = {
  repository: { name: "orders-web", forgeSlug: "acme/orders-web" },
  pullRequest: { number: 128, author: "mira", updatedMinutesAgo: 25 },
  reviewers: [{ login: "amara", state: "changes-requested" }],
  comments: [{ author: "teo", body: "I'll test it.", minutesAgo: 60 }],
  threads: [
    {
      path: "src/api/orders.ts",
      line: 17,
      isResolved: false,
      comments: [{ author: "amara", body: "This sends the status back.", minutesAgo: 140 }],
    },
  ],
  reviews: [{ author: "amara", verdict: "request-changes", body: "See inline.", minutesAgo: 138 }],
  chat: [
    { from: "reviewer", body: "Why the URL id?", minutesAgo: 40 },
    { from: "agent", body: "So the path and the body match.", minutesAgo: 39 },
  ],
  agentReplies: ["first scripted reply", "second scripted reply"],
  avatars: { amara: "/demo-avatars/amara.svg" },
}

const DEMO: DemoReview = {
  name: "demo-react",
  targets: [{ title: "Implement three pages", branch: "three-pages", artifact: HELD_STOCK_ARTIFACT }],
  story: STORY,
}

describe("demo reviews", () => {
  it("lists the demo repository as a GitHub repository with its pull request", () => {
    const repository = toDemoRepository(DEMO, NOW)

    expect(repository.forge).toBe("gh")
    expect(repository.forgeSlug).toBe("acme/orders-web")
    expect(repository.targets).toStrictEqual([
      expect.objectContaining({ kind: "pull-request", number: 128, author: "mira", title: "Implement three pages" }),
    ])
    expect(demoReviewPathOf(DEMO)).toBe("/pr-reviews/orders-web/pr-128")
  })

  it("puts each thread on the new side of its line and dates comments before now", () => {
    const pullRequest = toDemoPullRequest(DEMO, NOW)
    const [thread] = pullRequest.discussion.threads

    expect(pullRequest.url).toBe("https://github.com/acme/orders-web/pull/128")
    expect(thread.position).toStrictEqual({ path: "src/api/orders.ts", side: "new", startLine: 17, endLine: 17 })
    expect(thread.comments[0].createdAt).toStrictEqual(new Date(NOW.getTime() - 140 * MINUTE_MS))
    expect(pullRequest.discussion.reviews[0].verdict).toBe("request-changes")
  })

  it("gives each person the avatar the story names, and none to anyone else", () => {
    const pullRequest = toDemoPullRequest(DEMO, NOW)

    expect(pullRequest.reviewers[0].avatarUrl).toBe("/demo-avatars/amara.svg")
    expect(pullRequest.discussion.threads[0].comments[0].author.avatarUrl).toBe("/demo-avatars/amara.svg")
    expect(pullRequest.discussion.comments[0].author.avatarUrl).toBeNull()
  })

  it("marks each written reviewer message delivered through its own sequence", () => {
    const events = toDemoChat(DEMO, NOW)

    expect(events.map((event) => event.kind)).toStrictEqual(["reviewer-message", "delivery", "agent-message"])
    expect(events[1]).toStrictEqual(expect.objectContaining({ kind: "delivery", throughSequence: 1 }))
  })

  it("answers a visitor's first message with the first scripted reply", () => {
    const replies = toDemoAgentReplies(DEMO)
    const writtenAgentMessages = STORY.chat.filter((message) => message.from === "agent").length

    expect(replies[writtenAgentMessages % replies.length]).toBe("first scripted reply")
    expect(replies[(writtenAgentMessages + 1) % replies.length]).toBe("second scripted reply")
  })
})
