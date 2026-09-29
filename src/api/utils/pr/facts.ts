import { readCheckouts } from "../../mcp/checkouts"
import type { PullRequestFacts } from "../../mcp/resolveChange"
import { gitAdapterFor } from "../../../utils/git-adapter/helpers/session"

/**
 * What a pull request is called, and which commit it is at.
 *
 * The one fact in a walkthrough's opening that git cannot answer: a pull
 * request number means nothing to a checkout. The adapter answers it, for the
 * checkout the extension recorded for this repository.
 *
 * Null for every failure — no checkout recorded, no adapter sent, a host that
 * refused, plain git which has no pull requests — and `resolveChange` turns any of them into
 * one message asking the agent to pass the title and the commit itself.
 */
export async function pullRequestFacts(
  serverDirectory: string,
  repo: string,
  pr: number,
): Promise<PullRequestFacts | null> {
  const root = (await readCheckouts(serverDirectory))[repo]
  if (root === undefined) return null
  const resolved = await gitAdapterFor(root)
  if (!resolved.ok) return null

  try {
    const ref = { kind: "pr", number: pr } as const
    const target = await resolved.gitAdapter.target(ref)
    if (target === null) return null
    const head = await resolved.gitAdapter.headSha(ref)
    if (head === "") return null
    // The base rides along with the title, from the call that fetched both.
    return {
      title: target.title,
      head,
      ...(target.baseRef === undefined ? {} : { baseRef: target.baseRef }),
      ...(target.baseSha === undefined ? {} : { baseSha: target.baseSha }),
    }
  } catch {
    // A host that refused, a network that is not there, a CLI not signed in.
    return null
  }
}
