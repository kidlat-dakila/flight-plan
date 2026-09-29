import { readCheckouts } from "../mcp/checkouts"
import { readConfig } from "../mcp/config"
import { walkthroughKeyOf, type DocumentId } from "../mcp/documentId"
import { createStorage } from "../mcp/storage"
import { gitAdapterFor } from "../../utils/git-adapter/helpers/session"
import type { GitAdapter } from "../../lib/git-adapter/types"
import { FileAccessError, readRepoFile, resolveInRoot } from "../../utils/repo"
import { readFromSource, SourceError } from "../../utils/pr/source"
import { missingData, planContext, walkthroughContext, type PanelContext } from "../../utils/pr/context"
import { parseStoredDocument } from "../../lib/schemas/document/stored"
import { installedTheme } from "../../utils/theme"
import type { ReviewedStore } from "../utils/reviewed/store"
import { HttpError, type ApiId, type ArtifactResult, type Backend } from "./backend"

/**
 * The API over real storage: the documents agents wrote, the checkouts the
 * extension recorded, and the adapter it handed over.
 *
 * Sample ids go to the sample backend, so an installed server can open the
 * samples too.
 */

/** A commit as git accepts it, abbreviated or full. Nothing else reaches git. */
const SHA = /^[0-9a-f]{4,64}$/i

export function createInstalledBackend(options: {
  serverDirectory: string
  reviewed: ReviewedStore
  samples: Backend
}): Backend {
  const { serverDirectory, samples } = options

  const storage = async () => createStorage(await readConfig(serverDirectory))

  const checkoutOf = async (repo: string): Promise<string | null> =>
    (await readCheckouts(serverDirectory))[repo] ?? null

  const gitAdapterOf = async (root: string | null): Promise<GitAdapter | null> => {
    if (root === null) return null
    const resolved = await gitAdapterFor(root)
    return resolved.ok ? resolved.gitAdapter : null
  }

  /** The stored text of a document, or null when none is stored. */
  const readText = async (id: DocumentId): Promise<string | null> => {
    const store = await storage()
    if (id.kind === "plan") return store.readPlan(id.repo, id.name)
    const key = walkthroughKeyOf(id.name)
    if (key === null) throw new HttpError(404, `"${id.name}" is not a pull request or branch.`)
    return store.readWalkthrough(id.repo, key)
  }

  return {
    artifact: async (id: ApiId, query): Promise<ArtifactResult> => {
      if ("sample" in id) return samples.artifact(id, query)
      const stored = id.stored
      const text = await readText(stored)
      if (text === null) {
        if (stored.kind === "plan") {
          return { state: "failed", message: `No plan called ${stored.name} is stored for ${stored.repo}.` }
        }
        const key = walkthroughKeyOf(stored.name)
        if (key === null) throw new HttpError(404, `"${stored.name}" is not a pull request or branch.`)
        const gitAdapter = await gitAdapterOf(await checkoutOf(stored.repo))
        const target = gitAdapter === null ? null : await gitAdapter.target(key).catch(() => null)
        return { state: "missing", missing: missingData(stored.repo, key, target) }
      }
      const document = parseStoredDocument(text)
      if (document === null) {
        return {
          state: "failed",
          message: `The ${stored.kind} stored as ${stored.repo}/${stored.name} is not a valid Flight Plan document. Start it again to rewrite it.`,
        }
      }
      return { state: "document", document }
    },

    context: async (id: ApiId, query): Promise<PanelContext> => {
      if ("sample" in id) return samples.context(id, query)
      const stored = id.stored
      if (stored.kind === "plan") return planContext(stored.repo, stored.name)
      const ref = walkthroughKeyOf(stored.name)
      if (ref === null) throw new HttpError(404, `"${stored.name}" is not a pull request or branch.`)
      const text = await readText(stored)
      const root = await checkoutOf(stored.repo)
      return walkthroughContext({
        repo: stored.repo,
        ref,
        document: text === null ? null : parseStoredDocument(text),
        root,
        gitAdapter: await gitAdapterOf(root),
      })
    },

    /*
     * Only repositories `checkouts.json` knows, and only paths inside them
     *. A repository with no checkout but a sample of that name is the
     * sample's: a real checkout always wins.
     */
    file: async (repo, sha, path) => {
      const root = await checkoutOf(repo)
      if (root === null) {
        return samples.file(repo, sha, path).catch(() => {
          throw new HttpError(403, `${repo} is not a checkout Flight Plan knows. Open it in VS Code first.`)
        })
      }
      if (resolveInRoot(root, path) === null) {
        throw new HttpError(403, `${path} is outside the repository and was not read.`)
      }
      try {
        if (sha === null) return await readRepoFile(root, path)
        if (!SHA.test(sha)) throw new HttpError(400, `${sha} is not a commit.`)
        return await readFromSource({ kind: "commit", root, repo, sha, gitAdapter: await gitAdapterOf(root) }, path)
      } catch (cause) {
        if (cause instanceof HttpError) throw cause
        if (cause instanceof FileAccessError || cause instanceof SourceError) {
          throw new HttpError(404, cause.message)
        }
        throw cause
      }
    },

    theme: () => installedTheme(),

    reviewed: options.reviewed,

    seedReviewed: (id, document) => samples.seedReviewed(id, document),
  }
}
