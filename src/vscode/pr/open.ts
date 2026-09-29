import type * as vscode from "vscode"
import { openReview } from "../panel"
import type { ReviewTarget } from "../../lib/git-adapter/types"
import { walkthroughId } from "../utils/panel"
import { storageKey } from "../../utils/pr/review"

/**
 * Opens a pull request or branch as a walkthrough, or explains why it cannot.
 *
 * The panel asks the API, which reads the walkthrough stored on this machine
 * and the adapter the extension handed it. The absent case is not an error
 * and is not an empty view: the API answers `missing`, and the panel says so
 * and offers to write one.
 */
export function openPullRequest(
  context: vscode.ExtensionContext,
  target: ReviewTarget,
  repo: string,
): void {
  openReview(context, walkthroughId(repo, storageKey(target.ref)), { title: target.title })
}
