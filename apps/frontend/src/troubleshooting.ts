import { skipToken, useMutation, useQuery } from "@tanstack/react-query"
import { useLocation } from "@tanstack/react-router"
import { TRPCClientError } from "@trpc/client"
import { createContext, use, useCallback, useEffect, useState } from "react"
import { useTRPC } from "@/trpc"
import type { TroubleshootDialogContent, TroubleshootOutcome } from "@flightplan/ui/TroubleshootDialog"

export interface TroubleshootingSubject {
  readonly errorLogId: string | null
  readonly shownError: string | null
}

export interface Failure {
  readonly message: string
}

export type Troubleshoot = (subject: TroubleshootingSubject) => void

export interface ShownProblem {
  readonly message: string
  readonly failure: Failure | null
}

export interface TroubleshootingDialog {
  readonly content: TroubleshootDialogContent | null
  readonly loadProblem: string | null
  readonly outcome: TroubleshootOutcome | null
  readonly isLaunching: boolean
  readonly isCopied: boolean
  readonly onLaunch: (description: string) => void
  readonly onCopy: (command: string) => void
  readonly onClose: () => void
}

export interface TroubleshootingDialogState {
  readonly open: Troubleshoot
  readonly dialog: TroubleshootingDialog | null
}

const NO_SUBJECT: TroubleshootingSubject = { errorLogId: null, shownError: null }
const UNKNOWN_ERROR_MESSAGE = "The backend did not say what went wrong."

const ignoreSubject: Troubleshoot = () => undefined

export const TroubleshootingContext = createContext<Troubleshoot>(ignoreSubject)

export const useTroubleshoot = (): Troubleshoot => use(TroubleshootingContext)

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === "object" && value !== null

export const logIdOf = (failure: unknown): string | null => {
  if (!isRecord(failure) || !isRecord(failure.data)) return null
  return typeof failure.data.logId === "string" ? failure.data.logId : null
}

export const subjectOf = (failure: Failure): TroubleshootingSubject => ({ errorLogId: logIdOf(failure), shownError: failure.message })

export const shownProblemOf = (rejection: string | null, failure: Failure | null): ShownProblem | null => {
  if (rejection !== null) return { message: rejection, failure: null }
  return failure === null ? null : { message: failure.message, failure }
}

export const useFailureTroubleshooting = (): ((failure: Failure | null) => (() => void) | null) => {
  const troubleshoot = useTroubleshoot()
  return useCallback((failure: Failure | null) => (failure === null
    ? null
    : () => {
        troubleshoot(subjectOf(failure))
      }), [troubleshoot])
}

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE)

const isUnloggedPageError = (error: unknown): error is Error =>
  error instanceof Error && !(error instanceof TRPCClientError) && logIdOf(error) === null

export const usePageErrorTroubleshooting = (error: unknown): (() => void) => {
  const trpc = useTRPC()
  const troubleshoot = useTroubleshoot()
  const pathname = useLocation({ select: (location) => location.pathname })
  const { mutate: recordError, data: recorded } = useMutation(trpc.troubleshooting.recordError.mutationOptions())

  useEffect(() => {
    if (!isUnloggedPageError(error)) return
    recordError({ message: error.message, stack: error.stack ?? null, page: { path: pathname, title: document.title } })
  }, [error, pathname, recordError])

  return () => {
    troubleshoot({ errorLogId: logIdOf(error) ?? recorded?.logId ?? null, shownError: messageOf(error) })
  }
}

export const useTroubleshootingDialog = (): TroubleshootingDialogState => {
  const trpc = useTRPC()
  const pathname = useLocation({ select: (location) => location.pathname })
  const [subject, setSubject] = useState<TroubleshootingSubject | null>(null)
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null)
  const form = useQuery(trpc.troubleshooting.form.queryOptions(subject ?? skipToken))
  const request = useMutation(trpc.troubleshooting.request.mutationOptions())
  const { reset: resetRequest } = request

  const open = useCallback((next: TroubleshootingSubject) => {
    resetRequest()
    setCopiedCommand(null)
    setSubject(next)
  }, [resetRequest])

  const launch = (description: string): void => {
    request.mutate({ ...(subject ?? NO_SUBJECT), description, page: { path: pathname, title: document.title } })
  }

  const copy = (command: string): void => {
    navigator.clipboard.writeText(command).then(
      () => {
        setCopiedCommand(command)
      },
      () => {
        setCopiedCommand(null)
      },
    )
  }

  return {
    open,
    dialog: subject === null
      ? null
      : {
          content: form.data ?? null,
          loadProblem: form.error?.message ?? null,
          outcome: request.data ?? (request.error === null ? null : { kind: "rejected", message: request.error.message, field: null }),
          isLaunching: request.isPending,
          isCopied: request.data?.kind === "manual" && request.data.command === copiedCommand,
          onLaunch: launch,
          onCopy: copy,
          onClose: () => {
            setSubject(null)
          },
        },
  }
}
