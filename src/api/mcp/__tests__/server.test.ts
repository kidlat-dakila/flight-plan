import * as assert from "assert"
import { TOOL_NAMES } from "../contract"
import { serveHttp } from "../server"

/**
 * The session lifecycle, against a real listener on a real port.
 *
 * Worth an integration test rather than a unit one, because the thing that went
 * wrong was a *status code*: an unknown session answered 400, which no client
 * can recover from, where the protocol defines 404 as "start a new session".
 * Only a real request shows the code.
 */
suite("mcp server", () => {
  const TOKEN = "test-token"
  let port = 0
  let close: (() => Promise<void>) | null = null

  const url = () => `http://127.0.0.1:${port}/mcp/${TOKEN}`

  const post = (body: unknown, headers: Record<string, string> = {}) =>
    fetch(url(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        ...headers,
      },
      body: JSON.stringify(body),
    })

  const INITIALIZE = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "test", version: "0" },
    },
  }

  beforeAll(async () => {
    const server = await serveHttp(0, TOKEN, false)
    port = server.port
    close = server.close
  })

  afterAll(async () => {
    await close?.()
  })

  test("serves the token path and refuses every other one", async () => {
    const wrong = await fetch(`http://127.0.0.1:${port}/mcp/not-the-token`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    })
    assert.strictEqual(wrong.status, 404)
  })

  test("initialize opens a session and returns its id", async () => {
    const response = await post(INITIALIZE)
    assert.strictEqual(response.ok, true)
    assert.ok(
      response.headers.get("mcp-session-id"),
      "initialize should hand back a session id",
    )
  })

  test("answers 404 for a session id it does not know", async () => {
    // The case that wedged a running agent after an extension upgrade: the
    // server's sessions are in memory, so a replaced process knows none of the
    // ids its clients still hold. 404 is the protocol's "re-initialize".
    const response = await post(
      { jsonrpc: "2.0", id: 2, method: "tools/list" },
      { "mcp-session-id": "11111111-2222-3333-4444-555555555555" },
    )
    assert.strictEqual(response.status, 404)
    const body = (await response.json()) as { error?: { message?: string } }
    assert.match(String(body.error?.message), /send initialize/i)
  })

  test("answers 400 when no session id is given at all", async () => {
    // Not recoverable and not a restart: the request is simply malformed.
    const response = await post({ jsonrpc: "2.0", id: 3, method: "tools/list" })
    assert.strictEqual(response.status, 400)
  })

  test("a session accepts requests once it is open", async () => {
    const opened = await post(INITIALIZE)
    const id = opened.headers.get("mcp-session-id")
    assert.ok(id)
    const listed = await post(
      { jsonrpc: "2.0", id: 4, method: "tools/list" },
      { "mcp-session-id": id },
    )
    assert.strictEqual(listed.status, 200)
  })

  /**
   * The contract, against what the server actually offers.
   *
   * `TOOL_NAMES` claimed to be the list of the server's tools and nothing
   * compared the two, so it drifted: six tools were registered and unlisted,
   * and its own comment said a rename could not desynchronise them. Asked over
   * the protocol rather than read out of the source, because what a client sees
   * is the only definition of what the server offers.
   */
  test("offers exactly the tools the contract names", async () => {
    const opened = await post(INITIALIZE)
    const id = opened.headers.get("mcp-session-id")
    assert.ok(id)
    const listed = await post(
      { jsonrpc: "2.0", id: 5, method: "tools/list" },
      { "mcp-session-id": id },
    )
    assert.strictEqual(listed.status, 200)

    // The transport answers as an event stream, so the payload is the last
    // `data:` line rather than the whole body.
    const body = await listed.text()
    const payload = body
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .pop()
    assert.ok(payload !== undefined, `no data frame in: ${body.slice(0, 200)}`)

    const parsed = JSON.parse(payload) as { result?: { tools?: { name: string }[] } }
    const offered = (parsed.result?.tools ?? []).map((tool) => tool.name).sort()
    assert.ok(offered.length > 0, "the server offered no tools at all")
    assert.deepStrictEqual(offered, [...TOOL_NAMES].sort())
  })

  /**
   * `get-instructions` returns the active profile's resolved configuration.
   *
   * End to end over the protocol, because that is how an agent reaches it: with
   * no profiles directory the default profile answers, so the call needs no
   * setup and proves the embedded defaults resolve.
   */
  test("get-instructions returns the default profile's configuration", async () => {
    const opened = await post(INITIALIZE)
    const id = opened.headers.get("mcp-session-id")
    assert.ok(id)
    const called = await post(
      {
        jsonrpc: "2.0",
        id: 6,
        method: "tools/call",
        params: { name: "get-instructions", arguments: {} },
      },
      { "mcp-session-id": id },
    )
    assert.strictEqual(called.status, 200)

    const body = await called.text()
    const payload = body
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .pop()
    assert.ok(payload !== undefined)
    const parsed = JSON.parse(payload) as {
      result?: { content?: { text?: string }[] }
    }
    const textOut = parsed.result?.content?.[0]?.text
    assert.ok(textOut !== undefined, "the tool returned no text")
    const config = JSON.parse(textOut) as {
      profile?: string
      sections?: Record<string, boolean>
      fields?: { path: string; title: string }[]
      configs?: unknown[]
    }
    assert.strictEqual(config.profile, "default")
    assert.deepStrictEqual(config.sections, {
      diagram: true,
      blast: true,
      codeWalkthrough: true,
    })
    /*
     * The default call is an index and carries no prose at all.
     *
     * The whole surface is some seventy kilobytes: past the inline output cap,
     * so it lands in a file the agent pages through before it has written a
     * word. Even the voice is fetched now — an index that carries its most
     * important entries is how it grows back into the payload it replaced.
     */
    assert.ok((config.fields?.length ?? 0) > 0, "no fields indexed")
    assert.strictEqual(config.configs, undefined, "the default call returned the whole surface")
    assert.ok(
      config.fields?.some((one) => one.path === "writingStyle"),
      "the index does not say the voice can be fetched",
    )
    assert.ok(
      !textOut.includes("Wherever prose mentions code"),
      "the index carries prose rather than only naming what to fetch",
    )
    assert.ok(textOut.length < 4_000, `the index is ${String(textOut.length)} bytes`)
  })

  /**
   * What a tool asks for is what the document accepts.
   *
   * These are two schemas describing one thing, written in two packages, and
   * they drifted: `set-walkthrough-overview` *required* a `see` array of
   * waypoint ids long after the document dropped the field for inline `code:`
   * links. An agent that followed the declared contract was therefore refused
   * every time, and an agent that ignored a required field succeeded — which is
   * the wrong way round.
   *
   * Read over the protocol, because the JSON Schema a client is handed is the
   * contract; what the source says is only how it got there.
   */
  test("asks for exactly the fields the document schema accepts", async () => {
    const { contextBody, finding } = await import("../../../lib/schemas/document/schema")

    const opened = await post(INITIALIZE)
    const id = opened.headers.get("mcp-session-id")
    assert.ok(id)
    const listed = await post(
      { jsonrpc: "2.0", id: 6, method: "tools/list" },
      { "mcp-session-id": id },
    )
    const body = await listed.text()
    const payload = body
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .pop()
    assert.ok(payload !== undefined)

    type Shape = {
      type?: string
      properties?: Record<string, Shape>
      items?: Shape
      anyOf?: Shape[]
      oneOf?: Shape[]
      additionalProperties?: unknown
    }
    const tools = (JSON.parse(payload) as {
      result?: { tools?: { name: string; inputSchema?: Shape }[] }
    }).result?.tools ?? []
    const schemaOf = (name: string): Shape | undefined =>
      tools.find((tool) => tool.name === name)?.inputSchema

    /** One object of every property the tool declares, filled with a string. */
    const sample = (shape: Shape | undefined): Record<string, unknown> => {
      const properties = shape?.properties ?? {}
      const out: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(properties)) {
        out[key] = value.type === "array" ? ["x"] : "x"
      }
      return out
    }

    /*
     * One tool now, where there were four.
     *
     * The overview and the implementation list were a pair of tools per
     * document kind, and only one of the four had drifted from what the
     * document accepts — which is the whole argument for asking the schema
     * rather than trusting that two copies agree.
     */
    const scenario = sample(
      schemaOf("update-document")?.properties?.overview?.items,
    )
    assert.ok(Object.keys(scenario).length > 0, "update-document declares no scenario fields")

    const groups = schemaOf("update-document")?.properties?.implementation?.items
    const item = sample(groups?.properties?.items?.items)
    assert.ok(Object.keys(item).length > 0, "update-document declares no item fields")

    const checked = contextBody.safeParse({
      context: "Why anyone should care.",
      overview: [scenario],
      implementation: [{ label: "src/a.ts", items: [item] }],
    })

    assert.ok(
      checked.success,
      `update-document asks for fields the document refuses: ${JSON.stringify(checked.error?.issues)}`,
    )

    /*
     * A finding's code and its solution, which were free-form objects.
     *
     * `z.record(z.string(), z.unknown())` serialises to a schema that accepts
     * anything, so an agent that had not read the format reference invented a
     * shape and the tool took it. What this holds down is that the tool
     * declares a *shape* at all — a union of the two fence kinds rather than
     * an open object — and that a realistic finding still satisfies the
     * document.
     */
    /** Every `kind` a union declares, however the nullable wrapper nested it. */
    const kindsIn = (shape: Shape | undefined): string[] => {
      if (shape === undefined) return []
      const named = (shape.properties?.kind as { const?: unknown } | undefined)?.const
      const here = typeof named === "string" ? [named] : []
      const below = [...(shape.anyOf ?? []), ...(shape.oneOf ?? [])].flatMap(kindsIn)
      return [...here, ...below]
    }

    const findings = schemaOf("update-document")?.properties?.findings?.items
    assert.deepStrictEqual(
      kindsIn(findings?.properties?.code).sort(),
      ["proposal", "ref"],
      `a finding's code should be a union of the two fence kinds: ${JSON.stringify(findings?.properties?.code)}`,
    )
    /*
     * A document-level finding proposes a fix for the lines its own `code`
     * names, since it has no card to supply them.
     */
    assert.deepStrictEqual(
      Object.keys(findings?.properties?.solution?.properties ?? {}).sort(),
      ["body", "lang"],
      `update-document should ask for a solution as { lang, body }: ${JSON.stringify(findings?.properties?.solution)}`,
    )

    const reported = finding.safeParse({
      id: "f1",
      kind: "bug",
      title: "Loses the second page",
      reading: "The cursor is an offset into a list that shrinks as it is worked.",
      trace: ["It reads page one.", "It writes, and the list shrinks under the cursor."],
      code: { kind: "ref", lang: "ts", path: "src/a.ts", target: { symbol: "pageOf" } },
      solution: { lang: "ts", body: "const page = pages.shift()" },
    })
    assert.ok(
      reported.success,
      `a finding shaped as update-document asks for it is refused by the document: ${JSON.stringify(reported.error?.issues)}`,
    )
  })
})
