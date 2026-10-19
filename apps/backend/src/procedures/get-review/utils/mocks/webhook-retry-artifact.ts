import { parseMarkedSource } from "@flightplan/codegraph"
import type { ReviewArtifact, SourceFile } from "@flightplan/configurations"
import { mockTrace } from "./mock-trace"

const WEBHOOK_RETRY_PATH = "src/payments/webhook-retry.ts"
const WEBHOOK_QUEUE_PATH = "src/payments/webhook-queue.ts"

const WEBHOOK_RETRY = [
  " import { deliver, type WebhookEvent } from \"./webhook-delivery\"",
  "+import { wait } from \"../time/wait\"",
  "+",
  "+const MAX_ATTEMPTS = 5",
  "+const BASE_DELAY_MS = 500",
  " ",
  "#region retryDelayMs",
  "+export const retryDelayMs = (attempt: number): number => BASE_DELAY_MS * 2 ** attempt",
  "#endregion retryDelayMs",
  "+",
  "#region deliverWithRetry",
  "-export const deliverWithRetry = async (event: WebhookEvent): Promise<void> => {",
  "-  await deliver(event)",
  "-}",
  "+export const deliverWithRetry = async (event: WebhookEvent, attempt = 0): Promise<void> => {",
  "+  try {",
  "+    await deliver(event)",
  "+  } catch (error) {",
  "+    if (attempt + 1 >= MAX_ATTEMPTS) throw error",
  "+    await wait(retryDelayMs(attempt))",
  "+    await deliverWithRetry(event, attempt + 1)",
  "+  }",
  "+}",
  "#endregion deliverWithRetry",
].join("\n")

const WEBHOOK_QUEUE = [
  " import { deliverWithRetry } from \"./webhook-retry\"",
  " import { markDelivered, markDead, type QueuedEvent } from \"./webhook-store\"",
  " ",
  "#region handleQueuedEvent",
  " export const handleQueuedEvent = async (queued: QueuedEvent): Promise<void> => {",
  "-  await deliverWithRetry(queued.event)",
  "-  await markDelivered(queued.id)",
  "+  try {",
  "+    await deliverWithRetry(queued.event)",
  "+    await markDelivered(queued.id)",
  "+  } catch {",
  "+    await markDead(queued.id)",
  "+  }",
  " }",
  "#endregion handleQueuedEvent",
].join("\n")

export const WEBHOOK_RETRY_CHANGED_PATHS = [
  WEBHOOK_RETRY_PATH,
  WEBHOOK_QUEUE_PATH,
  "src/payments/__tests__/webhook-retry.spec.ts",
]

const WEBHOOK_RETRY_SOURCES: readonly SourceFile[] = [
  parseMarkedSource(WEBHOOK_RETRY_PATH, "typescript", WEBHOOK_RETRY),
  parseMarkedSource(WEBHOOK_QUEUE_PATH, "typescript", WEBHOOK_QUEUE),
]

export const WEBHOOK_RETRY_ARTIFACT: ReviewArtifact = {
  title: "Retry failed payment webhooks with backoff",
  status: "drafting",
  commit: "41d07ce",
  isSegmented: false,
  segments: [
    {
      id: "all",
      title: "Retry failed payment webhooks with backoff",
      changedPaths: WEBHOOK_RETRY_CHANGED_PATHS,
      context: [
        "A payment provider that is down for a few seconds makes the shop lose the event for good, and the order stays unpaid in the books. This change retries a failed delivery a few times with a growing pause, and sets the event aside when every attempt fails.",
        "",
        "## Overview",
        "",
        "- **When** a webhook delivery fails once and the provider recovers, **then** the event is delivered on a later attempt, and nobody notices.",
        "",
        "## Implementation",
        "",
        "**`src/payments`**",
        "",
        "- Retries up to five times in [`deliverWithRetry()`](code:src/payments/webhook-retry.ts#deliverWithRetry), with the pause from [`retryDelayMs()`](code:src/payments/webhook-retry.ts#retryDelayMs).",
      ].join("\n"),
      traceDiagram: mockTrace(
        WEBHOOK_RETRY_SOURCES,
        [
          { id: "handle-queued-event", type: "function", path: WEBHOOK_QUEUE_PATH, declaration: "handleQueuedEvent", isChanged: true, label: null, description: null },
          { id: "deliver-with-retry", type: "function", path: WEBHOOK_RETRY_PATH, declaration: "deliverWithRetry", isChanged: true, label: "Deliver, and try again on failure", description: "Calls itself with the next attempt number after a pause." },
          { id: "retry-delay-ms", type: "function", path: WEBHOOK_RETRY_PATH, declaration: "retryDelayMs", isChanged: true, label: null, description: null },
        ],
        [
          ["handle-queued-event", "deliver-with-retry"],
          ["deliver-with-retry", "retry-delay-ms"],
        ],
      ),
      blastDiagram: null,
      walkthrough: {
        files: [
          {
            path: WEBHOOK_RETRY_PATH,
            waypoints: [
              {
                id: "retry-delay-ms",
                title: "The pause doubles with every attempt",
                declaration: "retryDelayMs",
                codeBlocks: [],
                reading: "Half a second, then one, two and four. With five attempts the last pause is four seconds, so a delivery gives up after about seven and a half seconds.",
                needsAttention: null,
                findings: [],
                children: [],
              },
              {
                id: "deliver-with-retry",
                title: null,
                declaration: "deliverWithRetry",
                codeBlocks: [],
                reading: "",
                needsAttention: null,
                findings: [],
                children: [],
              },
            ],
          },
          {
            path: WEBHOOK_QUEUE_PATH,
            waypoints: [
              {
                id: "handle-queued-event",
                title: null,
                declaration: "handleQueuedEvent",
                codeBlocks: [],
                reading: "",
                needsAttention: null,
                findings: [],
                children: [],
              },
            ],
          },
        ],
      },
    },
  ],
  sources: WEBHOOK_RETRY_SOURCES,
  contextCodeBlocks: [],
  changedPaths: WEBHOOK_RETRY_CHANGED_PATHS,
}
