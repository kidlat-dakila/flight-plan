import { main } from "./server"

/**
 * The MCP server's entry point, and nothing else.
 *
 * A file of its own so `server.ts` can be imported without starting anything.
 * That was not a hypothetical tidiness: the session-lifecycle test could not
 * import the server at all, because importing it ran `main()`, which found no
 * token in the environment and called `process.exit(1)` under the test runner.
 */

// Failures go to stderr, which the extension logs.
main().catch((cause: unknown) => {
  process.stderr.write(`flightplan MCP server failed to start: ${String(cause)}\n`)
  process.exit(1)
})
