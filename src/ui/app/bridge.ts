import type { BridgeReply, BridgeRequest } from "../../api/api/protocol"
import { ApiError, type Transport } from "./api"

/**
 * The webview's transport: each request goes to the extension over
 * `postMessage`, and the extension answers with what the server said. See
 * `BridgeRequest` in `src/api/api/protocol.ts`.
 *
 * Correlated by id, because several queries are in flight at once and the
 * replies come back in any order. An aborted request only stops waiting: the
 * extension's reply, when it comes, is dropped.
 */
export function bridgeTransport(
  post: (request: BridgeRequest) => void,
  listen: (onReply: (reply: BridgeReply) => void) => void,
): Transport {
  const waiting = new Map<number, { resolve: (response: Response) => void; reject: (cause: unknown) => void }>()
  let next = 0

  listen((reply) => {
    const waiter = waiting.get(reply.id)
    if (waiter === undefined) return
    waiting.delete(reply.id)
    if ("error" in reply) {
      waiter.reject(new ApiError(reply.error, reply.final))
      return
    }
    waiter.resolve(new Response(reply.body, { status: reply.status, headers: { "content-type": reply.contentType } }))
  })

  return (route, init) =>
    new Promise<Response>((resolve, reject) => {
      const id = next++
      if (init.signal?.aborted === true) {
        reject(init.signal.reason)
        return
      }
      init.signal?.addEventListener("abort", () => {
        if (waiting.delete(id)) reject(init.signal?.reason)
      })
      waiting.set(id, { resolve, reject })
      post({ type: "api", id, method: init.method, route, ...(init.body === undefined ? {} : { body: init.body }) })
    })
}

export function isBridgeReply(data: unknown): data is BridgeReply {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { type?: unknown }).type === "apiReply" &&
    typeof (data as { id?: unknown }).id === "number"
  )
}
