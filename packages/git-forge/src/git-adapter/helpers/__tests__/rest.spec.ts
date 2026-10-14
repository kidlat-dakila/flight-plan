import * as assert from "node:assert"
import { vi, type Mock } from "vitest"
import {
  createRest,
  MAX_RETRY_WAIT_MS,
} from "@/git-adapter/helpers/rest"
import { GitAdapterError, type Fetcher } from "@/git-adapter/types"

function scripted(responses: readonly Response[]): {
  fetcher: Mock<Fetcher>
  calls: () => string[]
} {
  const fetcher = vi.fn<Fetcher>(async (input) => await Promise.reject(new Error(`unscripted call to ${input}`)))
  responses.forEach((response) => fetcher.mockResolvedValueOnce(response))
  return { fetcher, calls: () => fetcher.mock.calls.map(([input]) => input) }
}

function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  })
}

async function resolveNothing(): Promise<void> {
  await Promise.resolve()
}

function recordedSleep(): { waits: () => number[], sleep: (ms: number) => Promise<void> } {
  const sleep = vi.fn<(ms: number) => Promise<void>>(resolveNothing)
  return { waits: () => sleep.mock.calls.map(([ms]) => ms), sleep }
}

const CONFIG = {
  baseUrl: "https://api.example.com/v1",
  headers: { authorization: "Bearer secret" },
  name: "Example",
  sleep: resolveNothing,
}

const statusProblems: [number, string][] = [
  [401, "auth"],
  [403, "auth"],
  [404, "no-repo"],
  [500, "network"],
  [418, "unknown"],
]

suite("the shared REST layer", () => {
  it("a path is joined to the base without doubling the slash", async () => {
    const { fetcher, calls } = scripted([json({}), json({}), json({})])
    const rest = createRest({ ...CONFIG, fetcher })
    await rest.json("things")
    await rest.json("/things")
    await rest.json("https://api.example.com/v1/things?page=2")
    assert.deepStrictEqual(calls(), [
      "https://api.example.com/v1/things",
      "https://api.example.com/v1/things",
      "https://api.example.com/v1/things?page=2",
    ])
  })

  it("configured headers are sent on every request", async () => {
    const { fetcher } = scripted([json({ ok: true })])
    const rest = createRest({ ...CONFIG, fetcher })
    await rest.json("things")
    assert.strictEqual(
      new Headers(fetcher.mock.calls[0][1]?.headers).get("authorization"),
      "Bearer secret",
    )
  })

  it.each(statusProblems)("%i is reported as %s", async (status, problem) => {
    const body = new Response("nope", { status })
    const responses
      = status >= 500
        ? [body.clone(), body.clone(), body.clone(), body.clone()]
        : [body]
    const rest = createRest({
      ...CONFIG,
      fetcher: scripted(responses).fetcher,
    })
    await assert.rejects(
      async () => await rest.json("things"),
      (cause: unknown) =>
        cause instanceof GitAdapterError && cause.problem === problem,
    )
  })

  it("the body of a failure is kept, because the status text never says which scope", async () => {
    const rest = createRest({
      ...CONFIG,
      fetcher: scripted([
        new Response("Resource not accessible by personal access token", {
          status: 403,
        }),
      ]).fetcher,
    })
    await assert.rejects(
      async () => await rest.json("things"),
      (cause: unknown) =>
        cause instanceof GitAdapterError
        && cause.message.includes("personal access token"),
    )
  })

  it("a failure names the request that failed, without its query", async () => {
    const rest = createRest({
      ...CONFIG,
      fetcher: scripted([new Response("Authentication failed.", { status: 401 })]).fetcher,
    })
    await assert.rejects(
      async () => await rest.text("things?token=hidden", { method: "POST" }),
      (cause: unknown) =>
        cause instanceof GitAdapterError
        && cause.message === "Example answered 401 to POST /v1/things: Authentication failed.",
    )
  })

  it("a request that never gets a response is a network problem", async () => {
    const rest = createRest({
      ...CONFIG,
      fetcher: async () => await Promise.reject(new Error("ECONNREFUSED")),
    })
    await assert.rejects(
      async () => await rest.json("things"),
      (cause: unknown) =>
        cause instanceof GitAdapterError && cause.problem === "network",
    )
  })

  it("a rate limit is waited out and then retried", async () => {
    const { fetcher, calls } = scripted([
      new Response("slow down", {
        status: 429,
        headers: { "retry-after": "0" },
      }),
      json({ ok: true }),
    ])
    const rest = createRest({ ...CONFIG, fetcher })
    assert.deepStrictEqual(await rest.json("things"), { ok: true })
    assert.strictEqual(calls().length, 2)
  })

  it("an outrageous retry-after is capped rather than honoured", async () => {
    const { fetcher } = scripted([
      new Response("later", {
        status: 429,
        headers: { "retry-after": "86400" },
      }),
      json({ ok: true }),
    ])
    const recorded = recordedSleep()
    const rest = createRest({ ...CONFIG, fetcher, sleep: recorded.sleep })
    await rest.json("things")
    assert.deepStrictEqual(recorded.waits(), [MAX_RETRY_WAIT_MS])
  })

  it("a retry-after in seconds is honoured as milliseconds", async () => {
    const { fetcher } = scripted([
      new Response("later", { status: 429, headers: { "retry-after": "2" } }),
      json({ ok: true }),
    ])
    const recorded = recordedSleep()
    const rest = createRest({ ...CONFIG, fetcher, sleep: recorded.sleep })
    await rest.json("things")
    assert.deepStrictEqual(recorded.waits(), [2000])
  })

  it("a server error with no retry-after backs off exponentially", async () => {
    const { fetcher } = scripted(
      Array.from({ length: 6 }, () => new Response("boom", { status: 503 })),
    )
    const recorded = recordedSleep()
    const rest = createRest({ ...CONFIG, fetcher, sleep: recorded.sleep })
    await assert.rejects(async () => await rest.json("things"))
    assert.deepStrictEqual(recorded.waits(), [500, 1000, 2000])
  })

  it("giving up eventually rather than retrying a broken host forever", async () => {
    const { fetcher, calls } = scripted(
      Array.from({ length: 6 }, () => new Response("boom", { status: 503 })),
    )
    const rest = createRest({ ...CONFIG, fetcher })
    await assert.rejects(async () => await rest.json("things"))

    assert.strictEqual(calls().length, 4)
  })
})
