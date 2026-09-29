import * as fs from "node:fs/promises"
import * as path from "node:path"
import {
  StorageError,
  fileOfId,
  splitRepo,
  walkthroughName,
  type StorageConfig,
  type WalkthroughKey,
} from "./documentId"
import { PLAN_NAME_PATTERN } from "./contract"

/**
 * Where walkthroughs and plans live, and the only code that knows.
 *
 * Nothing in this module's public surface returns a path. Callers name a
 * subject and get text back; the mapping from subject to file stays here. That
 * is not tidiness, it is the security model: the agent is meant to reach these
 * documents only through the tools, and a path in a tool result or an error
 * message would hand it a way around them.
 */

export { StorageError }
export type { StorageConfig, WalkthroughKey }

/** File holding one change's walkthrough. Never leaves this module. */
function walkthroughFile(config: StorageConfig, repo: string, ref: WalkthroughKey): string {
  return fileOfId(config, { kind: "walkthrough", repo, name: walkthroughName(ref) })
}

/** File holding one plan. Never leaves this module. */
function planFile(config: StorageConfig, repo: string, name: string): string {
  return fileOfId(config, { kind: "plan", repo, name })
}

/**
 * Where a repository's archived plan names are recorded.
 *
 * A sidecar beside the plans rather than a key in the document.
 *
 * A field in the document was the obvious place and is the wrong one:
 * `update-plan` hands an agent the whole document to rewrite, so an
 * `archived: true` would survive only as long as the agent remembered to copy
 * it back. Archiving is also not
 * something the plan says about itself — it is something the reader has decided
 * about it — and putting it in the prose would mean editing a person's document
 * to change a view preference.
 *
 * Dot-prefixed so `listPlans`, which skips dot-files, cannot pick it up as a
 * plan: it is a `.json` file in the same directory.
 */
function archiveFile(config: StorageConfig, repo: string): string {
  const segments = splitRepo(repo)
  return path.join(config.planRoot, ...segments, ".archived.json")
}

async function readIfPresent(file: string): Promise<string | null> {
  try {
    return await fs.readFile(file, "utf8")
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT") return null
    // Deliberately not including the path: see the module comment.
    throw new StorageError("The document could not be read.")
  }
}

async function writeNew(file: string, text: string, subject: string): Promise<void> {
  if ((await readIfPresent(file)) !== null) {
    throw new StorageError(
      `${subject} already exists. Use the matching update tool, which preserves ` +
        `whatever a human has changed, instead of replacing it.`,
    )
  }
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, text, "utf8")
}

async function writeExisting(
  file: string,
  text: string,
  subject: string,
): Promise<void> {
  if ((await readIfPresent(file)) === null) {
    throw new StorageError(
      `${subject} does not exist yet. Use the matching create tool.`,
    )
  }
  await fs.writeFile(file, text, "utf8")
}

export type Storage = {
  readWalkthrough: (repo: string, ref: WalkthroughKey) => Promise<string | null>
  createWalkthrough: (
    repo: string,
    ref: WalkthroughKey,
    text: string,
  ) => Promise<void>
  updateWalkthrough: (
    repo: string,
    ref: WalkthroughKey,
    text: string,
  ) => Promise<void>
  readPlan: (repo: string, name: string) => Promise<string | null>
  /**
   * Stores a plan, whether or not one has that name. True when it was new.
   *
   * The one plan write an agent is given: a plan is written whole, so a
   * second write under the same name is a new version of it, not a mistake.
   */
  writePlan: (repo: string, name: string, document: string) => Promise<boolean>
  /** Replaces a plan that exists, for the edits made a piece at a time. */
  updatePlan: (repo: string, name: string, document: string) => Promise<void>
  /**
   * Plan names for a repository, oldest first.
   *
   * Names, not paths: the one thing this module exports about a plan is what to
   * call it, which is all a tool needs to read it back.
   *
   * Archived plans are included. Hiding them here would make them invisible to
   * the one view that offers to show them.
   */
  listPlans: (repo: string) => Promise<string[]>
  /** The archived plan names for a repository. */
  archivedPlans: (repo: string) => Promise<string[]>
  /** Archives a plan, or brings it back. */
  setPlanArchived: (repo: string, name: string, archived: boolean) => Promise<void>
}

export function createStorage(config: StorageConfig): Storage {
  const prSubject = (repo: string, ref: WalkthroughKey) =>
    ref.kind === "pr"
      ? `The walkthrough for ${repo}#${String(ref.number)}`
      : `The walkthrough for ${repo} on ${ref.name}`
  const planSubject = (repo: string, name: string) => `The plan "${name}" for ${repo}`

  return {
    readWalkthrough: (repo, ref) =>
      readIfPresent(walkthroughFile(config, repo, ref)),
    createWalkthrough: (repo, ref, text) =>
      writeNew(walkthroughFile(config, repo, ref), text, prSubject(repo, ref)),
    updateWalkthrough: (repo, ref, text) =>
      writeExisting(
        walkthroughFile(config, repo, ref),
        text,
        prSubject(repo, ref),
      ),

    readPlan: (repo, name) => readIfPresent(planFile(config, repo, name)),
    writePlan: async (repo, name, document) => {
      const file = planFile(config, repo, name)
      const created = (await readIfPresent(file)) === null
      await fs.mkdir(path.dirname(file), { recursive: true })
      await fs.writeFile(file, document, "utf8")
      return created
    },
    updatePlan: (repo, name, text) =>
      writeExisting(planFile(config, repo, name), text, planSubject(repo, name)),
    listPlans: async (repo) => {
      const segments = splitRepo(repo)
      const directory = path.join(config.planRoot, ...segments)
      let entries: string[]
      try {
        entries = await fs.readdir(directory)
      } catch (cause) {
        // No directory means no plans, which is not a failure.
        if ((cause as NodeJS.ErrnoException).code === "ENOENT") return []
        throw new StorageError("The plans could not be listed.")
      }
      const named = entries.filter(
        (entry) => entry.endsWith(".json") && !entry.startsWith("."),
      )
      const dated = await Promise.all(
        named.map(async (entry) => {
          const stat = await fs.stat(path.join(directory, entry)).catch(() => null)
          return { name: entry.slice(0, -".json".length), at: stat?.mtimeMs ?? 0 }
        }),
      )
      return dated.sort((a, b) => a.at - b.at).map((entry) => entry.name)
    },

    archivedPlans: async (repo) => {
      const raw = await readIfPresent(archiveFile(config, repo))
      if (raw === null) return []
      let parsed: unknown
      try {
        parsed = JSON.parse(raw)
      } catch {
        // A corrupt sidecar means nothing is archived, which shows every plan.
        // The other way round would hide plans with no way to get them back.
        return []
      }
      if (!Array.isArray(parsed)) return []
      return parsed.filter(
        (entry): entry is string =>
          typeof entry === "string" && PLAN_NAME_PATTERN.test(entry),
      )
    },

    setPlanArchived: async (repo, name, archived) => {
      // Through `planFile`, only to have it validate the name before it goes
      // into a file that decides what the view hides.
      planFile(config, repo, name)
      const current = new Set(await createStorage(config).archivedPlans(repo))
      if (archived) current.add(name)
      else current.delete(name)

      const file = archiveFile(config, repo)
      await fs.mkdir(path.dirname(file), { recursive: true })
      await fs.writeFile(file, `${JSON.stringify([...current], null, 2)}\n`, "utf8")
    },
  }
}
