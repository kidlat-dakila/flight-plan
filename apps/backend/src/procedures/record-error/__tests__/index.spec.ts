import { recordError } from "@/procedures/record-error"
import { createTestErrorLog } from "@/procedures/record-error/utils/__tests__/error-log-fixture"

describe("recordError", () => {
  it("logs an error the page reports, under the page it happened on", async () => {
    const { errorLog } = createTestErrorLog()

    const recorded = await recordError(
      { message: "Cannot read properties of undefined", stack: "TypeError at /Users/dana/app.js", page: { path: "/settings/agents", title: "Agents" } },
      { errorLog },
    )

    await expect(errorLog.read(recorded.logId)).resolves.toMatchObject({
      kind: "error",
      source: "Page /settings/agents",
      message: "Cannot read properties of undefined",
      stack: "TypeError at ~/app.js",
    })
  })
})
