import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Walkthrough } from "../components/Walkthrough"
import { Missing } from "../components/Missing"
import { Notice } from "../components/Notice"
import { Coverage } from "../components/Coverage"
import { ReviewHeader } from "../components/ReviewHeader"
import { Waiting } from "../components/Waiting"
import { createHost } from "../markdownHost"
import { DEFAULT_THEME } from "../highlight"
import {
  artifactQuery,
  changeReviewed,
  contextQuery,
  fileQuery,
  reviewedQuery,
  themeQuery,
  type SampleQuery,
} from "./api"
import type { ReviewControls } from "../components/waypointBox"
import { gitAdapterFileUrl } from "./browserHost"
import { useShell } from "./shell"
import "./app.css"

/**
 * `/review-flight-plan/{id}`: one document, as the panel shows it.
 *
 * Everything comes from the API: the document, the context around it, and
 * every file it cites, each through its own query. Nothing here
 * knows a sample from a stored document; the id says which, and the API
 * answers both the same way.
 */
export function ReviewPage({
  id,
  query,
  planRef,
  toolHint,
}: {
  id: string
  query: SampleQuery
  /** What copied references name the document by. */
  planRef: string
  toolHint: string
}) {
  const client = useQueryClient()
  const context = useQuery(contextQuery(id, query))
  // The highlighter's theme is the page's: the user's, read by the API.
  const theme = useQuery(themeQuery())
  const artifact = useQuery(artifactQuery(id, query))
  const shell = useShell()
  const navigate = useNavigate()
  useEffect(() => shell.guardLinks(window.document), [shell])

  // `notify`: VS Code's status bar in the webview, a toast in a browser.
  const [toast, setToast] = useState<string | null>(null)
  useEffect(() => {
    if (toast === null) return
    const timer = setTimeout(() => {
      setToast(null)
    }, 2500)
    return () => {
      clearTimeout(timer)
    }
  }, [toast])
  const notify = useCallback(
    (message: string) => {
      if (shell.notify === null) setToast(message)
      else shell.notify(message)
    },
    [shell],
  )
  const copy = useCallback(
    (text: string) => {
      navigator.clipboard.writeText(text).then(
        () => {
          notify("Prompt copied")
        },
        () => {
          notify("Could not copy the prompt")
        },
      )
    },
    [notify],
  )
  const openSetup = useCallback(() => {
    if (shell.openSetup === null) void navigate({ to: "/setup" })
    else shell.openSetup()
  }, [shell, navigate])

  const document = artifact.data?.state === "document" ? artifact.data.document : null

  /*
   * The context follows the document. Coverage, the openable files and the
   * links are worked out from what the document cites, and a document still
   * being written cites more with each piece. Read again when the document
   * changes — structural sharing keeps the same object while it does not —
   * rather than on every poll, because the context asks the code host.
   */
  const contextKey = contextQuery(id, query).queryKey
  const seenDocument = useRef(document)
  useEffect(() => {
    if (seenDocument.current === document) return
    seenDocument.current = document
    void client.invalidateQueries({ queryKey: contextKey })
  }, [client, document, contextKey])

  /*
   * The reader's reviewed marks, read once there is a document to mark.
   * A change is posted and the answer replaces the query's data, so the page
   * shows what the API worked out — a parent covering its children, a file
   * reviewed when every card is.
   */
  const reviewed = useQuery({ ...reviewedQuery(id), enabled: document !== null })
  const reviewedData = reviewed.data
  const review = useMemo<ReviewControls | undefined>(
    () =>
      reviewedData === undefined
        ? undefined
        : {
            waypoints: new Set(reviewedData.waypoints),
            files: new Set(reviewedData.files),
            onChange: (change) => {
              changeReviewed(client, id, change).catch((cause: unknown) => {
                notify(cause instanceof Error ? cause.message : "Could not store the mark")
              })
            },
          },
    [reviewedData, client, id, notify],
  )
  // A refetch of an unchanged document keeps the same object (TanStack
  // Query's structural sharing), so the renderer does not redo its work.
  const at = context.data?.at ?? null
  const links = context.data?.links ?? null

  const host = useMemo(
    () =>
      createHost(
        notify,
        async (path) => {
          if (document === null) {
            throw new Error(`${path} cannot be read before the document has loaded.`)
          }
          // The commit the document read this file at, else its own head.
          // A plan has neither: its files are read from the working tree.
          const head = document.meta.kind === "walkthrough" ? document.meta.head : null
          const sha = document.sources[path]?.at ?? head
          return await client.fetchQuery(fileQuery(at?.repo ?? document.meta.repo, sha, path))
        },
        (path, line) => {
          if (shell.openFile !== null) {
            shell.openFile(path, line)
            return
          }
          // No editor in a browser: the file at its commit on the adapter.
          const url = gitAdapterFileUrl(links, at, path, line)
          if (url === null) notify("Opening a file needs VS Code")
          else shell.openExternal(url)
        },
        shell.openExternal,
      ),
    [client, document, at, links, notify, shell],
  )

  const failure = context.error ?? artifact.error
  if (failure !== null) {
    return (
      <div className="fp-message fp-failed">
        <p>{failure.message}</p>
      </div>
    )
  }
  if (context.data === undefined) return <Waiting text="Opening…" />

  const header = context.data.header
  const bar =
    header === null ? null : (
      <ReviewHeader data={header} onOpenSetup={openSetup} onOpenExternal={shell.openExternal} />
    )
  const toastElement =
    toast === null ? null : (
      <div className="fp-toast" role="status">
        {toast}
      </div>
    )

  const loaded = artifact.data
  // Waited for, so the code is highlighted once, in the right colours; a
  // theme that cannot be read is the default rather than a failure.
  if (loaded === undefined || (theme.isPending && !theme.isError)) {
    return (
      <>
        {bar}
        <Waiting text={context.data.waiting ?? "Opening…"} />
      </>
    )
  }
  if (loaded.state === "failed") {
    return (
      <>
        {bar}
        <div className="fp-message fp-failed">
          <p>{loaded.message}</p>
        </div>
      </>
    )
  }
  if (loaded.state === "missing") {
    return (
      <>
        {bar}
        <Missing {...loaded.missing} onCopy={copy} />
        {toastElement}
      </>
    )
  }

  return (
    <>
      {bar}
      {context.data.coverage ? <Coverage coverage={context.data.coverage} /> : null}
      {context.data.notice ? (
        <Notice
          notice={context.data.notice}
          onCopy={copy}
          onOpenSetup={openSetup}
          onFetchBranch={() => {
            if (shell.fetchBranch === null) notify("Fetching a branch needs VS Code")
            else shell.fetchBranch()
          }}
        />
      ) : null}
      <Walkthrough
        document={loaded.document}
        host={host}
        theme={theme.data ?? DEFAULT_THEME}
        planRef={planRef}
        toolHint={toolHint}
        at={at}
        links={context.data.links}
        openable={context.data.openable}
        {...(review === undefined ? {} : { review })}
      />
      {toastElement}
    </>
  )
}
