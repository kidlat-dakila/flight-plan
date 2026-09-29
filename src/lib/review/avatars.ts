import type { Fetcher, Person, Reviewer, ReviewSummary } from "../git-adapter/types"

/**
 * Avatars, fetched by the extension and handed to the panel as `data:` URIs.
 *
 * The panel cannot load them itself. Its CSP is `default-src 'none'` with
 * `img-src ${webview.cspSource} data:`, and the comment in `panel.ts` says why
 * that is deliberate: an accidental network reference should fail loudly rather
 * than silently phone out. Widening it to a adapter's CDN would trade that
 * property away for a picture, and would have to be widened again per host.
 *
 * So the fetch happens here, on the machine that already talks to the adapter,
 * and what crosses into the webview is bytes it can render with the policy
 * unchanged. It also means the reader's browser never announces to a third
 * party which pull request they are looking at and when.
 *
 * Everything here degrades to an empty string, never to an error. An avatar is
 * decoration around information the header already has: a face that does not
 * load costs a monogram, and a header that refused to render because somebody's
 * picture 404'd would be a worse tool than one with no pictures at all.
 */

/** The largest picture worth inlining. Real avatars are a few kilobytes. */
export const MAX_AVATAR_BYTES = 64 * 1024

/** How many to fetch for one header, however many people are attached. */
export const MAX_AVATARS = 12

/** How long one picture may hold up the header. */
export const AVATAR_TIMEOUT_MS = 4_000

/**
 * The types that may be inlined.
 *
 * An allowlist rather than a check for `image/`, and SVG is deliberately not on
 * it. The three hosts all serve raster avatars, so nothing is lost, and an SVG
 * is a document that can carry script and external references — harmless in an
 * `<img>` today, but not a thing to pipe from a third party into a webview on
 * the strength of a content-type header.
 */
const INLINABLE = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"])

/**
 * Whether a URL is one we are willing to fetch.
 *
 * `https` only. These strings come from a adapter's API response, which is data
 * rather than instruction: a `file:` URL would read the extension host's disk
 * and a `data:` one would be passed through unexamined, and neither is
 * something an avatar field should be able to ask for.
 */
export function fetchableAvatar(url: string): boolean {
  try {
    return new URL(url).protocol === "https:"
  } catch {
    return false
  }
}

/**
 * Fetches each distinct URL and returns the ones that became a `data:` URI.
 *
 * Distinct, because the author of a pull request is very often one of its
 * reviewers and the same picture would otherwise be fetched and inlined twice,
 * once per place it appears.
 *
 * Concurrent, and bounded by `MAX_AVATARS` rather than by a pool: a dozen
 * small images to one host is one round of requests, and a queue here would
 * add latency to the thing it is meant to protect.
 */
export async function inlineAvatars(
  urls: readonly string[],
  options: {
    fetcher?: Fetcher
    maxBytes?: number
    maxImages?: number
    timeoutMs?: number
  } = {},
): Promise<Map<string, string>> {
  const fetcher: Fetcher = options.fetcher ?? ((input, init) => fetch(input, init))
  const maxBytes = options.maxBytes ?? MAX_AVATAR_BYTES
  const timeoutMs = options.timeoutMs ?? AVATAR_TIMEOUT_MS

  const wanted = [...new Set(urls.filter(fetchableAvatar))].slice(
    0,
    options.maxImages ?? MAX_AVATARS,
  )
  const found = new Map<string, string>()

  await Promise.all(
    wanted.map(async (url) => {
      // Its own controller per request, so one slow host does not cancel the
      // others. Cleared on every path: an uncleared timer keeps the extension
      // host's event loop alive after the panel has been closed.
      const abort = new AbortController()
      const timer = setTimeout(() => {
        abort.abort()
      }, timeoutMs)
      try {
        const response = await fetcher(url, { signal: abort.signal })
        if (!response.ok) return

        const type = (response.headers.get("content-type") ?? "")
          .split(";")[0]
          ?.trim()
          .toLowerCase()
        if (type === undefined || !INLINABLE.has(type)) return

        const bytes = Buffer.from(await response.arrayBuffer())
        // Checked after reading rather than trusting `content-length`, which a
        // host need not send and which describes what it intends to send
        // rather than what arrived.
        if (bytes.byteLength === 0 || bytes.byteLength > maxBytes) return

        found.set(url, `data:${type};base64,${bytes.toString("base64")}`)
      } catch {
        // Refused, timed out, unreachable, or not an image. All of them cost
        // this one picture and nothing else.
      } finally {
        clearTimeout(timer)
      }
    }),
  )

  return found
}

/**
 * The same summary with every reachable avatar replaced by its `data:` URI.
 *
 * A person whose picture could not be fetched keeps an empty `avatarUrl`
 * rather than the original: handing the panel an `https:` URL it is forbidden
 * to load would produce a broken image where a monogram belongs, and the CSP
 * violation would be reported in a console nobody has open.
 */
export async function withInlineAvatars(
  summary: ReviewSummary,
  options: Parameters<typeof inlineAvatars>[1] = {},
): Promise<ReviewSummary> {
  const inlined = await inlineAvatars(
    [summary.author.avatarUrl, ...summary.reviewers.map((one) => one.avatarUrl)],
    options,
  )
  const swap = <T extends Person>(person: T): T => ({
    ...person,
    avatarUrl: inlined.get(person.avatarUrl) ?? "",
  })
  return {
    author: swap(summary.author),
    reviewers: summary.reviewers.map((one) => swap<Reviewer>(one)),
  }
}
