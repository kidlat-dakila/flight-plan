import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useSubscription } from "@trpc/tanstack-react-query"
import { useState } from "react"
import { useTRPC } from "@/trpc"
import type { Conversation, ModelChoice, QuestionAnswering } from "@flightplan/ui/ChatPanel"
import type { GivenAnswer } from "@flightplan/ui/QuestionBatch"

interface ReviewKey {
  readonly repositoryName: string
  readonly targetId: string
}

export interface AgentChat {
  readonly isOpen: boolean
  readonly reference: string | null
  readonly conversation: Conversation | undefined
  readonly modelChoice: ModelChoice | null
  readonly isSending: boolean
  readonly sendProblem: string | null
  readonly answering: QuestionAnswering
  readonly onToggle: () => void
  readonly onClose: () => void
  readonly onAsk: (reference: string) => void
  readonly onClearReference: () => void
  readonly onSend: (body: string) => void
  readonly onAnswer: (batchId: string, answers: readonly GivenAnswer[]) => void
  readonly onChooseModel: (model: string) => void
}

export const useAgentChat = (reviewKey: ReviewKey, onProblem: (message: string) => void): AgentChat => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [reference, setReference] = useState<string | null>(null)
  const conversation = useSubscription(trpc.conversation.watch.subscriptionOptions(reviewKey, { enabled: isOpen }))
  const modelChoice = useQuery({ ...trpc.conversation.modelChoice.queryOptions(reviewKey), enabled: isOpen })
  const reportError = (error: { readonly message: string }): void => {
    onProblem(error.message)
  }
  const sendMessage = useMutation(
    trpc.conversation.sendMessage.mutationOptions({
      onSuccess: (result) => {
        if (result.kind === "sent") setReference(null)
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
    reference,
    conversation: conversation.data,
    modelChoice: modelChoice.data ?? null,
    isSending: sendMessage.isPending,
    sendProblem: sendMessage.data?.kind === "rejected" ? sendMessage.data.message : null,
    answering: {
      pendingBatchId: answerQuestions.isPending ? answerQuestions.variables.batchId : null,
      rejection: answerRejection,
    },
    onToggle: () => { setIsOpen((wasOpen) => !wasOpen) },
    onClose: () => { setIsOpen(false) },
    onAsk: (askedReference) => {
      setReference(askedReference)
      setIsOpen(true)
    },
    onClearReference: () => { setReference(null) },
    onSend: (body) => { sendMessage.mutate({ ...reviewKey, body, reference }) },
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
