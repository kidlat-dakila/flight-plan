/**
 * What a host action does in a browser, where no VS Code answers it.
 *
 * The webview hands these to the extension: a status bar message, the editor,
 * a checked `openExternal`. A browser has none of that, so each does the
 * nearest honest thing — a toast, the file on the adapter, a new tab — and says
 * so when there is nothing it can do.
 */

/** A file at a commit on the adapter, for `openFile` where there is no editor. */
export function gitAdapterFileUrl(
  links: { prUrl: string } | null,
  at: { repo: string; sha: string } | null,
  path: string,
  line: number,
): string | null {
  if (at === null) return null
  // The pull request's own host, so a GitHub Enterprise sample would work;
  // github.com otherwise. Browser mode serves only the samples, whose
  // fake adapter is GitHub, so the GitHub blob route is the one needed.
  let origin = "https://github.com"
  if (links !== null && links.prUrl !== "") {
    try {
      origin = new URL(links.prUrl).origin
    } catch {
      // Keep github.com rather than build a link from nothing.
    }
  }
  return `${origin}/${at.repo}/blob/${at.sha}/${path}#L${String(line)}`
}

/** Opens a URL in a new tab, never in this one: the page is the app. */
export function openOutside(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer")
}

/**
 * Sends a link in rendered prose to a new tab.
 *
 * Prose is HTML the Markdown renderer wrote, so React attaches nothing to its
 * links; followed as they are, they would replace this page. Bubble phase and
 * `defaultPrevented`, so a component that handled the click itself
 * (`OutwardLink`, the `code:` and `#slug` handlers) keeps it.
 */
export function openLinksOutside(doc: Document): () => void {
  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0) return
    const target = event.target
    if (!(target instanceof Element)) return
    const anchor = target.closest("a[href]")
    if (!(anchor instanceof HTMLAnchorElement)) return
    if (!/^https?:$/i.test(anchor.protocol) || anchor.origin === doc.location.origin) return
    event.preventDefault()
    openOutside(anchor.href)
  }
  doc.addEventListener("click", onClick)
  return () => {
    doc.removeEventListener("click", onClick)
  }
}
