import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useSubscription } from "@trpc/tanstack-react-query"
import { useState } from "react"
import type { Failure } from "@/troubleshooting"
import { useTRPC } from "@/trpc"
import type { Conversation, Excerpt, ModelChoice, QuestionAnswering } from "@flightplan/ui/ChatPanel"
import type { GivenAnswer } from "@flightplan/ui/QuestionBatch"
import type { ToastContent } from "./use-toast"

interface ReviewKey {
  readonly repositoryName: string
  readonly targetId: string
}

interface Attachment {
  readonly reference: string
  readonly excerpt: Excerpt
}

export interface AgentChat {
  readonly isOpen: boolean
  readonly reference: string | null
  readonly excerpt: Excerpt | null
  readonly conversation: Conversation | undefined
  readonly modelChoice: ModelChoice | null
  readonly isSending: boolean
  readonly sendProblem: string | null
  readonly answering: QuestionAnswering
  readonly onOpen: () => void
  readonly onClose: () => void
  readonly onAsk: (reference: string, excerpt: Excerpt) => void
  readonly onClearReference: () => void
  readonly onSend: (body: string) => void
  readonly onAnswer: (batchId: string, answers: readonly GivenAnswer[]) => void
  readonly onChooseModel: (model: string) => void
}

export const useAgentChat = (reviewKey: ReviewKey, onProblem: (content: ToastContent) => void): AgentChat => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [attachment, setAttachment] = useState<Attachment | null>(null)
  const conversation = useSubscription(trpc.conversation.watch.subscriptionOptions(reviewKey, { enabled: isOpen }))
  const modelChoice = useQuery({ ...trpc.conversation.modelChoice.queryOptions(reviewKey), enabled: isOpen })
  const reportError = (error: Failure): void => {
    onProblem(error)
  }
  const sendMessage = useMutation(
    trpc.conversation.sendMessage.mutationOptions({
      onSuccess: (result) => {
        if (result.kind === "sent") setAttachment(null)
      },
      onError: reportError,
    }),
  )
  const answerQuestions = useMutation(
    trpc.conversation.answerQuestions.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.review.get.pathFilter())
      },
      onError: reportError,
    }),
  )
  const chooseModel = useMutation(
    trpc.conversation.chooseModel.mutationOptions({
      onSuccess: async (result) => {
        if (result.kind === "rejected") onProblem(result.message)
        await queryClient.invalidateQueries(trpc.conversation.modelChoice.pathFilter())
      },
      onError: reportError,
    }),
  )
  const answerRejection = answerQuestions.data?.kind === "rejected" && answerQuestions.variables !== undefined
    ? { batchId: answerQuestions.variables.batchId, message: answerQuestions.data.message }
    : null

  return {
    isOpen,
    reference: attachment?.reference ?? null,
    excerpt: attachment?.excerpt ?? null,
    conversation: conversation.data,
    modelChoice: modelChoice.data ?? null,
    isSending: sendMessage.isPending,
    sendProblem: sendMessage.data?.kind === "rejected" ? sendMessage.data.message : null,
    answering: {
      pendingBatchId: answerQuestions.isPending ? answerQuestions.variables.batchId : null,
      rejection: answerRejection,
    },
    onOpen: () => { setIsOpen(true) },
    onClose: () => { setIsOpen(false) },
    onAsk: (reference, excerpt) => {
      setAttachment({ reference, excerpt })
      setIsOpen(true)
    },
    onClearReference: () => { setAttachment(null) },
    onSend: (body) => { sendMessage.mutate({ ...reviewKey, body, reference: attachment?.reference ?? null, excerpt: attachment?.excerpt ?? null }) },
    onAnswer: (batchId, answers) => {
      answerQuestions.mutate({
        ...reviewKey,
        batchId,
        answers: answers.map((answer) => ({ ...answer, pickedLabels: [...answer.pickedLabels] })),
      })
    },
    onChooseModel: (model) => { chooseModel.mutate({ ...reviewKey, model }) },
  }
}
