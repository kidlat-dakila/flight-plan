import { z } from "zod"

/**
 * Leaf schemas shared by the document and the diagram.
 *
 * Their own file for one structural reason: a diagram node addresses code the
 * same way a fence does, so both schemas need `refTarget`, and putting it in
 * either one would make the two import each other.
 */

/**
 * A repository name, as two or more path segments.
 *
 * Two *or more*, because GitLab nests groups: `group/subgroup/project` is one
 * project, and a pattern allowing exactly one slash refuses the majority of
 * projects on a self-managed instance.
 */
export const REPO_PATTERN = /^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)+$/

export const repoName = z
  .string()
  .regex(REPO_PATTERN, "must be owner/repo, for example acme/storefront")

/**
 * A full commit.
 *
 * Abbreviated forms are refused deliberately. `head` decides which bytes every
 * reference is read at, and an ambiguous prefix resolves differently in a
 * repository that has grown since.
 */
export const sha = z
  .string()
  .regex(
    /^[0-9a-f]{40}$/,
    "must be a full 40-character commit SHA, not a branch name",
  )

export type LineRange = { from: number; to: number }

const line = z.number().int().positive()

/**
 * An inclusive range of file lines.
 *
 * **Authored as a pair**, because `[145, 163]` is terse to write and an agent
 * writes a great many of them. **Parsed to `{ from, to }`**, because that is
 * what every consumer already takes.
 *
 * It also accepts the object form, which makes parsing idempotent, and that is
 * load-bearing rather than tidy. The resolver produces a parsed document and
 * the stored schema validates one; without this, a document could not be
 * checked against the schema that describes it, and the two would only be
 * found to disagree at the write.
 */
export const lineRange = z
  .union([
    z.tuple([line, line]).transform(([a, b]) => ({ from: a, to: b })),
    z.object({ from: line, to: line }).strict(),
  ])
  .transform(({ from, to }): LineRange => ({
    from: Math.min(from, to),
    to: Math.max(from, to),
  }))

export type RefTarget = { symbol: string } | { focus: LineRange }

/**
 * How a fence or a diagram node addresses code.
 *
 * A symbol is preferred and is what a skill should reach for: it is the name
 * the sentence already says, it needs no counting, and it resolves against the
 * repository at write time. A focus is the fallback for code no declaration
 * addresses — a few lines inside a function, a config entry, or a file in a
 * language nothing can parse.
 *
 * `strict` on both arms, so a target carrying one of each is refused rather
 * than silently resolved by whichever the parser reaches first.
 */
export const refTarget = z.union([
  z.object({ symbol: z.string().min(1) }).strict(),
  z.object({ focus: lineRange }).strict(),
])
