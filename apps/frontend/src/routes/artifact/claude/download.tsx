import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link, Navigate } from "@tanstack/react-router"
import { useState } from "react"
import { useTRPC } from "@/trpc"
import Button from "@flightplan/ui/blocks/button"
import BusyLabel from "@flightplan/ui/BusyLabel"

export interface DownloadSearch {
  readonly artifact: string
  readonly repository: string
  readonly target: string
}

const REFRESH_INTERVAL_MS = 2000

const textOf = (value: unknown): string => (typeof value === "string" ? value : "")

const importRequestOf = (search: DownloadSearch) => ({
  artifactUrl: search.artifact,
  repositoryName: search.repository,
  targetId: search.target,
})

const DownloadPage = () => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const search = Route.useSearch()
  const started = Route.useLoaderData()
  const request = importRequestOf(search)
  const [followedImportId, setFollowedImportId] = useState(started.importId)
  const { data: form } = useSuspenseQuery({
    ...trpc.review.importForm.queryOptions(request),
    refetchInterval: REFRESH_INTERVAL_MS,
  })
  const startImport = useMutation(
    trpc.review.import.mutationOptions({
      onSuccess: async ({ importId }) => {
        setFollowedImportId(importId)
        await queryClient.invalidateQueries(trpc.review.importForm.pathFilter())
      },
    }),
  )
  const refusal = startImport.error?.message ?? (startImport.data?.importId === null ? startImport.data.message : started.refusal)

  if (form.isFinished && form.importId !== null && form.importId === followedImportId) {
    return <Navigate to="/pr-reviews/$repoName/$branchId" params={{ repoName: search.repository, branchId: search.target }} replace />
  }
  return (
    <section className="max-w-prose">
      <h1 className="text-4xl leading-10 font-bold tracking-[-0.02em]">{form.heading}</h1>
      <p className="mt-2 text-muted-foreground">{form.message}</p>
      {form.details.length === 0
        ? null
        : (
            <dl className="mt-6 grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-1 text-sm">
              {form.details.map((detail) => (
                <div key={detail.label} className="contents">
                  <dt className="text-muted-foreground">{detail.label}</dt>
                  <dd className="font-mono break-all">{detail.value}</dd>
                </div>
              ))}
            </dl>
          )}
      {form.warning === null ? null : <p className="mt-6 font-bold text-signal-text">{form.warning}</p>}
      {form.isImporting || startImport.isPending ? <BusyLabel label={form.pendingLabel} className="mt-6" /> : null}
      {refusal === null || form.isImporting ? null : <p role="alert" className="mt-6 text-destructive">{refusal}</p>}
      <div className="mt-6 flex items-center gap-4">
        {form.submitLabel === null || form.isImporting
          ? null
          : <Button disabled={startImport.isPending} onClick={() => { startImport.mutate(request) }}>{form.submitLabel}</Button>}
        {form.reviewHref === null
          ? null
          : (
              <Link to="/pr-reviews/$repoName/$branchId" params={{ repoName: search.repository, branchId: search.target }} className="underline">
                Open the review page
              </Link>
            )}
      </div>
    </section>
  )
}

export const Route = createFileRoute("/artifact/claude/download")({
  validateSearch: (search: Record<string, unknown>): DownloadSearch => ({
    artifact: textOf(search.artifact),
    repository: textOf(search.repository),
    target: textOf(search.target),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ context: { queryClient, trpc }, deps }) => {
    const request = importRequestOf(deps)
    const form = await queryClient.query({ ...trpc.review.importForm.queryOptions(request), staleTime: "static" })
    if (!form.startsAtOnce) return { importId: form.isImporting ? form.importId : null, refusal: null }
    const started = await queryClient.getMutationCache().build(queryClient, trpc.review.import.mutationOptions()).execute(request)
    await queryClient.invalidateQueries(trpc.review.importForm.pathFilter())
    return { importId: started.importId, refusal: started.importId === null ? started.message : null }
  },
  component: DownloadPage,
})
