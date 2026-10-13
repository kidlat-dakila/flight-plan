import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { afterAll, describe, expect, it } from "vitest"
import { GithubCLIAdapter } from "@/git-adapter/github-cli-adapter"

const REF = { kind: "pr", number: 7 } as const
const OK = "HTTP/2.0 200 OK\r\nContent-Type: application/json\r\n\r\n{}"
const REFUSED
  = "HTTP/2.0 422 Unprocessable Entity\r\nContent-Type: application/json\r\n\r\n"
    + "{\"message\":\"Unprocessable Entity\",\"errors\":[\"Can not approve your own pull request\"]}"

const FAKE_GH = `#!/bin/sh
echo "$*" >> "$FAKE_GH_DIR/calls.log"
case "$*" in
  *--input*) cat >> "$FAKE_GH_DIR/input.log"; echo >> "$FAKE_GH_DIR/input.log" ;;
esac
case "$*" in
  *pulls/9/reviews*) cat "$FAKE_GH_DIR/refused.http"; exit 1 ;;
  *) cat "$FAKE_GH_DIR/ok.http" ;;
esac
`

const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "flightplan-fake-gh-review-"))
const bin = path.join(scratch, "bin")
const environment = { PATH: [bin, "/usr/bin", "/bin"].join(path.delimiter), FAKE_GH_DIR: scratch }

await fs.mkdir(bin)
await fs.writeFile(path.join(bin, "gh"), FAKE_GH, { mode: 0o755 })
await fs.writeFile(path.join(scratch, "ok.http"), OK)
await fs.writeFile(path.join(scratch, "refused.http"), REFUSED)

const readLog = async (name: string): Promise<string[]> => {
  const log = await fs.readFile(path.join(scratch, name), "utf8").catch(() => "")
  return log.split("\n").filter((line) => line !== "")
}

const clearLogs = async (): Promise<void> => {
  await Promise.all(
    ["calls.log", "input.log"].map(async (name) => {
      await fs.rm(path.join(scratch, name), { force: true })
    }),
  )
}

const adapter = new GithubCLIAdapter({ root: scratch, repo: "acme/shop", environment })

afterAll(async () => {
  await fs.rm(scratch, { recursive: true, force: true })
})

describe("GithubCLIAdapter review", () => {
  it("sends a review through gh with its method and its body as JSON on standard input", async () => {
    await clearLogs()

    await adapter.submitReview(REF, {
      verdict: "approve",
      body: "Good.",
      commitSha: "abc1234",
      comments: [{ position: { path: "src/price.ts", side: "new", startLine: 4, endLine: 6 }, body: "Clamp it." }],
    })

    expect(await readLog("calls.log")).toStrictEqual([
      "api -i -X POST -H Content-Type: application/json --input - repos/acme/shop/pulls/7/reviews",
    ])
    expect((await readLog("input.log")).map((line) => JSON.parse(line) as unknown)).toStrictEqual([
      {
        commit_id: "abc1234",
        body: "Good.",
        event: "APPROVE",
        comments: [{ path: "src/price.ts", body: "Clamp it.", line: 6, side: "RIGHT", start_line: 4, start_side: "RIGHT" }],
      },
    ])
  })

  it("removes a review request with a DELETE, and sends a thread change as a GraphQL field", async () => {
    await clearLogs()

    await adapter.removeReviewRequests(REF, ["grace"])
    await adapter.resolveThread(REF, "T_1")

    const calls = await readLog("calls.log")
    expect(calls[0]).toBe("api -i -X DELETE -H Content-Type: application/json --input - repos/acme/shop/pulls/7/requested_reviewers")
    expect(calls.slice(1).join("\n")).toContain("api -i -f query=mutation {")
    expect(calls.slice(1).join("\n")).toContain("resolveReviewThread(input: { threadId: \"T_1\" })")
    expect((await readLog("input.log")).map((line) => JSON.parse(line) as unknown)).toStrictEqual([{ reviewers: ["grace"] }])
  })

  it("passes on the code host's own reason when it refuses", async () => {
    await expect(
      adapter.submitReview({ kind: "pr", number: 9 }, { verdict: "approve", body: "", commitSha: "abc1234", comments: [] }),
    ).rejects.toMatchObject({ message: "Can not approve your own pull request" })
  })
})
