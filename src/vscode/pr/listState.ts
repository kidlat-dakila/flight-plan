import type * as vscode from "vscode"
import type { Filter } from "../../lib/git-adapter/types"
import { parseRefKey, refKey, sameRef, type TargetRef } from "../../lib/git-adapter/types"

/**
 * What this panel is showing, remembered per folder.
 *
 * Workspace state rather than settings, for both halves. A filter and a pinned
 * pull request are working notes: which reviews you are chasing this week, the
 * one a colleague linked you an hour ago. Settings would put them in
 * `.vscode/settings.json`, where they are one `git add .` away from being
 * everybody's filter, and where a colleague pulling the repository inherits a
 * list built around somebody else's review queue.
 */

/**
 * Pull requests somebody asked for by name.
 *
 * The list is a search, and a search is about a category: the pull requests
 * awaiting your review, the ones carrying a label. A pin is the other thing a
 * reviewer needs, which is *this one*, the one a colleague just linked in a
 * message, whether or not it matches the search and after it stops matching.
 *
 * Numbers, not URLs. The repository is already decided by the window, and
 * storing a URL would invite a pin from somewhere else to survive in the list
 * of a repository it has nothing to do with.
 */

/**
 * Where the pins live.
 *
 * Workspace state keyed by repository, so two folders open in two windows keep
 * their own pins, and so a pin cannot follow you into a repository where its
 * number means a different pull request. Not settings: a pin is a working note,
 * not a preference, and it has no business in a file somebody might commit.
 */
export class Pins {
  constructor(private readonly memento: vscode.Memento) {}

  private key(repo: string): string {
    return `flightPlan.pins.${repo.toLowerCase()}`
  }

  /**
   * The pins for a repository, pull requests and branches alike.
   *
   * Stored as keys rather than numbers, because a branch has no number and
   * modelling one as a pull request with a made-up number would put that
   * fiction into the storage paths and the permalinks, where it would be
   * indistinguishable from a real number that happened to collide with it.
   *
   * A bare number still reads, since that is what pins were before branches
   * existed. Refusing them would silently empty the pin list of everybody who
   * had one, on an upgrade, with nothing to say why.
   */
  list(repo: string): TargetRef[] {
    if (repo === "") return []
    const stored = this.memento.get<unknown>(this.key(repo))
    if (!Array.isArray(stored)) return []
    const refs = stored
      .map((value) => parseRefKey(value))
      .filter((ref): ref is TargetRef => ref !== null)
    // Pull requests by number, then branches by name, so the list is stable
    // between loads rather than in whichever order they were added.
    return refs.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "pr" ? -1 : 1
      if (a.kind === "pr" && b.kind === "pr") return a.number - b.number
      return refKey(a).localeCompare(refKey(b))
    })
  }

  async add(repo: string, ref: TargetRef): Promise<void> {
    const next = this.list(repo).filter((pinned) => !sameRef(pinned, ref))
    next.push(ref)
    await this.memento.update(this.key(repo), next.map((pinned) => refKey(pinned)))
  }

  async remove(repo: string, ref: TargetRef): Promise<void> {
    const next = this.list(repo).filter((pinned) => !sameRef(pinned, ref))
    await this.memento.update(
      this.key(repo),
      next.length === 0 ? undefined : next.map((pinned) => refKey(pinned)),
    )
  }
}

/**
 * The filter the three buttons write.
 *
 * Defaults to the pull requests awaiting your review, which is the list this
 * panel existed to show before any of it was configurable. An empty review
 * list means any review state, so the default is one entry rather than none.
 */
export class Filters {
  constructor(private readonly memento: vscode.Memento) {}

  private key(name: string): string {
    return `flightPlan.filter.${name}`
  }

  filter(): Filter {
    const stored = this.memento.get<unknown>(this.key("review"))
    /*
     * Any string, not a key from a fixed list.
     *
     * Review filters belong to the adapter and do not translate between hosts, so
     * there is no single set to validate against here. A key the current adapter
     * does not know is ignored by that adapter rather than rejected — which is
     * also what makes switching hosts survivable: the GitHub default simply
     * stops applying on GitLab instead of filtering to nothing.
     */
    const review = Array.isArray(stored)
      ? stored.filter((value): value is string => typeof value === "string")
      : DEFAULT_REVIEW
    const labels = this.memento.get<unknown>(this.key("labels"))
    return {
      review,
      labels: Array.isArray(labels)
        ? labels.filter((value): value is string => typeof value === "string")
        : [],
    }
  }

  includeMine(): boolean {
    const stored = this.memento.get<unknown>(this.key("includeMine"))
    return typeof stored === "boolean" ? stored : true
  }

  async setReview(review: readonly string[]): Promise<void> {
    await this.memento.update(this.key("review"), [...review])
  }

  async setLabels(labels: readonly string[]): Promise<void> {
    await this.memento.update(this.key("labels"), [...labels])
  }

  async setIncludeMine(include: boolean): Promise<void> {
    await this.memento.update(this.key("includeMine"), include)
  }
}

/**
 * What the panel showed before any of this was configurable.
 *
 * A GitHub key, which is right because GitHub is where this list came from and
 * harmless elsewhere: a adapter that does not know the key ignores it, so a
 * GitLab reader gets every open merge request rather than none.
 */
const DEFAULT_REVIEW: string[] = ["awaiting-me-or-team"]

