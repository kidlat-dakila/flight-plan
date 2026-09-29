import { parseId, walkthroughKeyOf } from "../../api/mcp/documentId"
import { planIdOf } from "../../api/mcp/identity"

/** Pure helpers the routes and the entry share, kept apart so tests need no DOM. */

/** The plan ref copy references name a stored document by. */
export function planRefOf(id: string): string {
  const parsed = parseId(id)
  if (parsed === null) return id
  if (parsed.kind === "plan") return planIdOf({ kind: "create", repo: parsed.repo, name: parsed.name })
  const key = walkthroughKeyOf(parsed.name)
  return key === null ? id : planIdOf({ kind: "review", repo: parsed.repo, key })
}

/**
 * The routes' address for a harness URL from before the router.
 *
 * `/?sample=<name>&…` was the harness's only way in, and the style baselines
 * name pages that way. They keep
 * working: the name moves into the path, the rest of the query stays.
 */
export function legacySampleUrl(search: string): string | null {
  const params = new URLSearchParams(search)
  const name = params.get("sample")
  if (name === null) return null
  params.delete("sample")
  // `side` chose the code column, which nothing reads any more.
  params.delete("side")
  const rest = params.toString()
  const path = name === "walkthrough" ? "/review-flight-plan/sample" : `/review-flight-plan/sample/${encodeURIComponent(name)}`
  return `${path}${rest === "" ? "" : `?${rest}`}`
}
