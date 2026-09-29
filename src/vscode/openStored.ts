import type * as vscode from "vscode"
import { openReview } from "./panel"
import type { OpenRequest } from "../api/mcp/control"
import { planId, walkthroughId } from "./utils/panel"

/**
 * Opens a walkthrough or plan an assistant has just written.
 *
 * The `open-*` tools exist so the assistant can say "I have written it, show
 * them", and this is what acts on that. The panel reads the
 * document, its context and its files from the API itself, so this only names
 * the document. The panel follows the
 * document as it is written by polling while it is `drafting`.
 */
export function openStored(
  context: vscode.ExtensionContext,
  request: OpenRequest,
  options: { preserveFocus?: boolean } = {},
): void {
  const id =
    request.kind === "walkthrough" ? walkthroughId(request.repo, request.ref) : planId(request.repo, request.name)
  openReview(context, id, options)
}
