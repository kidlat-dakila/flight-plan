import { VscodeButton, VscodeIcon } from "../vscode"
import type { MissingData } from "../../utils/pr/context"

/**
 * What a pull request with no walkthrough looks like.
 *
 * Deliberately not an empty view and not an error. Most pull requests have no
 * walkthrough, the reader asked to look at this one, and the useful answer is to
 * say what is missing and offer to write it. Generating is a button, never
 * automatic: it hands the job to the reader's own assistant.
 */

/**
 * The data is the API's `MissingData` (`src/utils/pr/context.ts`), declared
 * once. Its `prompt` is optional because the extension host and the webview
 * are separate bundles that can be different versions of themselves: a
 * missing field must degrade to something usable rather than copying the
 * word "undefined".
 */
export type MissingProps = MissingData & {
  onCopy: (text: string) => void
}

export function Missing({
  repo,
  number,
  branch,
  title,
  author,
  url,
  prompt,
  onCopy,
}: MissingProps) {
  const text =
    prompt !== undefined && prompt !== ""
      ? prompt
      : `/flightplan:review ${repo}#${number}`
  return (
    <div className="fp-missing">
      <p className="fp-missing-eyebrow">
        {repo} {branch == null ? `#${String(number)}` : branch} · {author}
      </p>
      <h1>{title}</h1>
      <p>
        No walkthrough has been written for this pull request yet, so there is
        nothing to read in order.
      </p>
      <p className="fp-missing-note">
        To have one written, paste this into Claude Code, Codex, or whichever
        assistant you use. It reads the change and writes the walkthrough on
        this machine. Nothing is posted to the pull request.
      </p>
      <pre className="fp-missing-prompt">{text}</pre>
      <div className="fp-missing-actions">
        <VscodeButton
          icon="copy"
          onClick={() => {
            onCopy(text)
          }}
        >
          Copy prompt
        </VscodeButton>
      </div>
      {url === "" ? null : (
        <p className="fp-missing-note">
          <a href={url}>
            <VscodeIcon name="link-external" />
            Open on your code host
          </a>
        </p>
      )}
    </div>
  )
}
