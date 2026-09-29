import { HEAD, REPO } from "./files"
import { WALKTHROUGH_HUNKS } from "./walkthrough"

/**
 * What the adapter and the extension would tell the panel about the sample.
 *
 * The review header, the staleness notices, the coverage bar, the links into
 * the pull request, and the panel states that are not a document at all. A
 * fake adapter in data: the people, the pull request and its commit are
 * invented, like the repository.
 *
 * The types repeat the panel's own, structurally. They are declared on both
 * sides of the extension ↔ webview protocol today, and one declaration for
 * them is later work; a harness that assigns these to the panel's types is
 * what catches the two drifting apart.
 */

export type SampleReviewer = {
  login: string
  name?: string
  avatarUrl: string
  state: "pending" | "approved" | "changes-requested" | "commented"
}

export const REVIEW_STATES = ["pending", "approved", "changes-requested", "commented"] as const

/** The pull request the walkthrough sample belongs to. */
export const SAMPLE_PR = {
  number: 412,
  title: "Reserve stock before charging the card",
  url: `https://github.com/${REPO}/pull/412`,
  author: { login: "grace", name: "Grace Hopper", avatarUrl: "" },
}

/**
 * The review bar, with one reviewer in every state.
 *
 * Every avatar is empty, which draws the monogram — the path a real panel
 * falls back to whenever a picture cannot be fetched.
 */
export const SAMPLE_HEADER = {
  kind: "review" as const,
  title: SAMPLE_PR.title,
  author: SAMPLE_PR.author,
  reviewers: REVIEW_STATES.map((state, index): SampleReviewer => {
    const people = [
      { login: "ada", name: "Ada Lovelace" },
      { login: "bo" },
      { login: "babbage", name: "Charles Babbage" },
      { login: "zoe" },
    ]
    return { ...(people[index % people.length] ?? { login: state }), avatarUrl: "", state }
  }),
  url: SAMPLE_PR.url,
  label: `#${String(SAMPLE_PR.number)}`,
}

/** The header plain git gets, which has no people in it. */
export const SAMPLE_BARE_HEADER = {
  kind: "bare" as const,
  branch: "stock-check",
  gitAdapterName: "git",
}

const PROMPT = `/flightplan:review ${REPO}#${String(SAMPLE_PR.number)}`

/** The staleness banners, one per kind the panel draws. */
export const SAMPLE_NOTICES = {
  warn: {
    level: "warn" as const,
    text: "Out of date: This Flight Plan walkthrough is behind 2 commits.",
    detail:
      "The lines it points at have changed in src/checkout/placeOrder.ts, src/checkout/hasStock.ts and 2 more. " +
      `You are reading the code as it was at ${HEAD.slice(0, 8)}, which is what the walkthrough describes, not what the pull request contains now.`,
    prompt: PROMPT,
  },
  info: {
    level: "info" as const,
    text: "This Flight Plan walkthrough is behind 2 commits, but not in the lines it points at.",
    prompt: PROMPT,
  },
  git: {
    level: "info" as const,
    text: "Read with git, so nothing here has been checked against the change as it stands.",
    prompt: PROMPT,
    actions: ["setup" as const, "fetch" as const],
    branch: "stock-check",
  },
}

export type SampleNoticeKind = keyof typeof SAMPLE_NOTICES

/**
 * Which changed files a waypoint cites, for the coverage bar.
 *
 * Computed from the sample rather than written, so adding a waypoint to a
 * changed file moves the bar the way it would on a real pull request.
 */
export function sampleCoverage(cited: readonly string[]): {
  covered: number
  total: number
  uncovered: string[]
} {
  const changed = Object.keys(WALKTHROUGH_HUNKS)
  const uncovered = changed.filter((path) => !cited.includes(path))
  return { covered: changed.length - uncovered.length, total: changed.length, uncovered }
}

/**
 * A diff anchor per cited file, shaped like GitHub's.
 *
 * A real anchor is a hash of the path. This is a stable 32-hex string per path,
 * which is all the panel needs: without one, a waypoint renders no link out.
 */
export function sampleLinks(paths: readonly string[]): {
  prUrl: string
  anchors: Record<string, string>
} {
  const anchors: Record<string, string> = {}
  for (const path of paths) {
    let hash = 2166136261
    let hex = ""
    for (let round = 0; hex.length < 32; round += 1) {
      for (const char of `${String(round)}:${path}`) {
        hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0
      }
      hex += hash.toString(16).padStart(8, "0")
    }
    anchors[path] = hex.slice(0, 32)
  }
  return { prUrl: SAMPLE_PR.url, anchors }
}

/** Files the editor may open. The rest link to the pull request. */
export const SAMPLE_OPENABLE = ["src/checkout/placeOrder.ts", "src/checkout/types.ts"]

/** The repository and commit the panel qualifies references with. */
export const SAMPLE_AT = { repo: REPO, sha: HEAD }

/** A pull request with no stored walkthrough. */
export const SAMPLE_MISSING = {
  reason: "absent" as const,
  repo: REPO,
  number: 418,
  title: "Show the reservation on the order page",
  author: "ada",
  url: `https://github.com/${REPO}/pull/418`,
  prompt: `/flightplan:review ${REPO}#418`,
}

/** A panel whose document could not be read. */
export const SAMPLE_FAILED = {
  message: `Could not read the walkthrough for ${REPO}#${String(SAMPLE_PR.number)}: the stored file is not valid JSON.`,
}

/** A panel still fetching. */
export const SAMPLE_WAITING = { text: `Reading #${String(SAMPLE_PR.number)} from GitHub` }

/**
 * What the reader has marked as reviewed in each sample, before they touch it.
 *
 * Reviewed state is not in a document, so it is seeded here and applied
 * as marks when a sample has no stored state yet: one file marked directly,
 * two single waypoints, and in the plan a parent, which covers its children.
 */
export const SAMPLE_REVIEWED: Partial<Record<string, { waypoints: string[]; files: string[] }>> = {
  walkthrough: {
    files: ["src/checkout/errors.ts"],
    waypoints: ["total-unchanged", "levels-not-cached"],
  },
  plan: { files: [], waypoints: ["sweep-job"] },
}
