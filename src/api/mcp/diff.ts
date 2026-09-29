import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { hunksByPath, type Hunk } from "../utils/pr/hunks"

const run = promisify(execFile)

/**
 * What a change did to each file, from git.
 *
 * The rest of this module family reads git's own files rather than running it —
 * `headSha` walks `HEAD` and `packed-refs` by hand, so the server needs no git
 * on the path to answer which commit a checkout is on. A diff is where that
 * stops being possible: reconstructing one means implementing git's own
 * history walk and content comparison, which is not a thing to hand-roll.
 *
 * So this shells out, and treats every failure the same way — **no diff, said
 * plainly**. A missing git, a commit the checkout has never fetched, a
 * repository with no common ancestor: none of them are worth telling apart,
 * because the answer to all of them is that the marks cannot be computed and
 * the author should be told so rather than shown a document with none.
 *
 * `base...head`, the three-dot form, which is what a pull request shows: the
 * changes on head since the two diverged, not every change on base since then.
 * A walkthrough describes the branch's own work.
 */
export async function hunksBetween(
  root: string,
  base: string | undefined,
  head: string,
): Promise<Record<string, Hunk> | null> {
  if (base === undefined || base.trim() === "") return null

  try {
    const { stdout } = await run(
      "git",
      [
        "diff",
        // No colour, no external diff tool, no pager: this output is parsed.
        "--no-color",
        "--no-ext-diff",
        // Rename detection off. A renamed file's diff is a rename header and
        // nothing else, so its added lines would go missing from the marks.
        "--no-renames",
        // No context. Every context line is a line the parser has to count
        // past, and the hunk headers already carry the numbering.
        "--unified=0",
        `${base}...${head}`,
      ],
      { cwd: root, maxBuffer: 64 * 1024 * 1024, windowsHide: true },
    )
    return hunksByPath(stdout)
  } catch {
    return null
  }
}
