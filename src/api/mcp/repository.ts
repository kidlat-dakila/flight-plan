/**
 * What the write path needs from a checkout, and nothing more.
 *
 * These two types lived in the Markdown validator, which is gone. They never
 * belonged to it: a document is checked against *some* repository, and what
 * that repository is — a commit for a walkthrough, a working tree for a plan —
 * is a question about storage rather than about any particular format.
 *
 * Injected rather than imported so the resolver stays free of git and `gh`.
 * Every consumer of these is testable with an object literal.
 */

export type Kind = "walkthrough" | "plan"

export type Repository = {
  /**
   * What everything is checked against, for the messages to name.
   *
   * A commit for a walkthrough, and a branch name for a plan, whose substrate
   * is the working tree.
   */
  head: string
  /** File contents at `head`, or null when the path is not there. */
  readFile: (path: string) => Promise<string | null>
  /** Paths the pull request changes. Empty disables the coverage checks. */
  changedFiles: () => Promise<string[]>
}
