import * as assert from "assert"
import {
  createRest,
  MAX_RETRY_WAIT_MS,
  type Fetcher,
} from "../rest"
import { GitAdapterError } from "../../../../lib/git-adapter/types"

/**
 * A fetcher that answers from a script and records what it was asked.
 *
 * The retry logic is the reason these tests exist. It is a loop that can hang a
 * panel — and untested backoff is the kind of code that looks obviously right
 * and waits an hour because a host asked it to.
 */
function scripted(responses: Response[]): {
  fetcher: Fetcher
  calls: string[]
} {
  const calls: string[] = []
  let index = 0
  return {
    calls,
    fetcher: (input: string) => {
      calls.push(input)
      const response = responses[index]
      index += 1
      if (response === undefined) throw new Error(`unscripted call to ${input}`)
      return Promise.resolve(response)
    },
  }
}

function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  })
}

/** Records what each retry asked to wait, and waits none of it. */
function recordedSleep(): { waits: number[]; sleep: (ms: number) => Promise<void> } {
  const waits: number[] = []
  return {
    waits,
    sleep: (ms: number) => {
      waits.push(ms)
      return Promise.resolve()
    },
  }
}

const CONFIG = {
  baseUrl: "https://api.example.com/v1",
  headers: { authorization: "Bearer secret" },
  name: "Example",
  sleep: () => Promise.resolve(),
}

suite("the shared REST layer", () => {
  test("a path is joined to the base without doubling the slash", async () => {
    const { fetcher, calls } = scripted([json({}), json({}), json({})])
    const rest = createRest({ ...CONFIG, fetcher })
    await rest.json("things")
    await rest.json("/things")
    await rest.json("https://api.example.com/v1/things?page=2")
    assert.deepStrictEqual(calls, [
      "https://api.example.com/v1/things",
      "https://api.example.com/v1/things",
      "https://api.example.com/v1/things?page=2",
    ])
  })

  test("configured headers are sent on every request", async () => {
    let seen: RequestInit["headers"]
    const rest = createRest({
      ...CONFIG,
      fetcher: (_input, init) => {
        seen = init?.headers
        return Promise.resolve(json({ ok: true }))
      },
    })
    await rest.json("things")
    assert.strictEqual(
      new Headers(seen).get("authorization"),
      "Bearer secret",
    )
  })

  /*
   * Status codes, in the vocabulary the views already speak. 403 is `auth`
   * rather than a category of its own because on all three hosts it is
   * overwhelmingly a token missing a scope, and the answer is the same as for a
   * missing token: go to setup.
   */
  const STATUSES: [number, string][] = [
    [401, "auth"],
    [403, "auth"],
    [404, "no-repo"],
    [500, "network"],
    [418, "unknown"],
  ]
  for (const [status, problem] of STATUSES) {
    test(`${String(status)} is reported as ${problem}`, async () => {
      // A 500 retries, so it needs enough responses to exhaust the attempts.
      const body = new Response("nope", { status })
      const responses =
        status >= 500
          ? [body.clone(), body.clone(), body.clone(), body.clone()]
          : [body]
      const rest = createRest({
        ...CONFIG,
        fetcher: scripted(responses).fetcher,
      })
      await assert.rejects(
        async () => rest.json("things"),
        (cause: unknown) =>
          cause instanceof GitAdapterError && cause.problem === problem,
      )
    })
  }

  test("the body of a failure is kept, because the status text never says which scope", async () => {
    const rest = createRest({
      ...CONFIG,
      fetcher: scripted([
        new Response("Resource not accessible by personal access token", {
          status: 403,
        }),
      ]).fetcher,
    })
    await assert.rejects(
      async () => rest.json("things"),
      (cause: unknown) =>
        cause instanceof GitAdapterError &&
        cause.message.includes("personal access token"),
    )
  })

  test("a request that never gets a response is a network problem", async () => {
    const rest = createRest({
      ...CONFIG,
      fetcher: () => Promise.reject(new Error("ECONNREFUSED")),
    })
    await assert.rejects(
      async () => rest.json("things"),
      (cause: unknown) =>
        cause instanceof GitAdapterError && cause.problem === "network",
    )
  })

  test("a rate limit is waited out and then retried", async () => {
    const { fetcher, calls } = scripted([
      new Response("slow down", {
        status: 429,
        headers: { "retry-after": "0" },
      }),
      json({ ok: true }),
    ])
    const rest = createRest({ ...CONFIG, fetcher })
    assert.deepStrictEqual(await rest.json("things"), { ok: true })
    assert.strictEqual(calls.length, 2)
  })

  /*
   * Bounded, because a host is entitled to ask for an hour and a panel that
   * hangs for an hour is indistinguishable from one that is broken. Asserted on
   * the delay that was asked for, not by sitting through it.
   */
  test("an outrageous retry-after is capped rather than honoured", async () => {
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
    assert.deepStrictEqual(recorded.waits, [MAX_RETRY_WAIT_MS])
  })

  test("a retry-after in seconds is honoured as milliseconds", async () => {
    const { fetcher } = scripted([
      new Response("later", { status: 429, headers: { "retry-after": "2" } }),
      json({ ok: true }),
    ])
    const recorded = recordedSleep()
    const rest = createRest({ ...CONFIG, fetcher, sleep: recorded.sleep })
    await rest.json("things")
    assert.deepStrictEqual(recorded.waits, [2000])
  })

  /*
   * With no `Retry-After` the delay doubles, so a host that is briefly
   * unhealthy is not hammered. Worth pinning: an exponent that is accidentally
   * linear looks fine in a passing test and is the difference between three
   * requests and thirty against a struggling host.
   */
  test("a server error with no retry-after backs off exponentially", async () => {
    const { fetcher } = scripted(
      Array.from({ length: 6 }, () => new Response("boom", { status: 503 })),
    )
    const recorded = recordedSleep()
    const rest = createRest({ ...CONFIG, fetcher, sleep: recorded.sleep })
    await assert.rejects(async () => rest.json("things"))
    assert.deepStrictEqual(recorded.waits, [500, 1000, 2000])
  })

  test("giving up eventually rather than retrying a broken host forever", async () => {
    const { fetcher, calls } = scripted(
      Array.from({ length: 6 }, () => new Response("boom", { status: 503 })),
    )
    const rest = createRest({ ...CONFIG, fetcher })
    await assert.rejects(async () => rest.json("things"))
    // Three retries after the first attempt, then it stops.
    assert.strictEqual(calls.length, 4)
  })
})
