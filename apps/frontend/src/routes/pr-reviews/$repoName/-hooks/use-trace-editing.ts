import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { inferInput, inferOutput, TRPCOptionsProxy } from "@trpc/tanstack-react-query"
import { useState } from "react"
import { useTRPC } from "@/trpc"
import type { AppRouter } from "@flightplan/backend/router"
import type { CardMoving, JourneyBandAuthoring } from "@flightplan/ui/JourneyBand"

interface ReviewKey {
  readonly repositoryName: string
  readonly targetId: string
}

type ReviewRoutes = TRPCOptionsProxy<AppRouter>["review"]

export type DiagramEdit = inferInput<ReviewRoutes["editJourney"]>["edit"]
export type CardForm = inferOutput<ReviewRoutes["cardForm"]>
export type CardBlocks = inferOutput<ReviewRoutes["cardBlocks"]>
type CardAdditionEdit = Extract<DiagramEdit, { readonly kind: "add-card" }>

export type NewCard = Omit<CardAdditionEdit, "kind" | "lineEnd">
type LineEnd = NonNullable<CardAdditionEdit["lineEnd"]>
export type CardContent = Omit<Extract<DiagramEdit, { readonly kind: "change-card" }>, "kind" | "nodeId">

export interface CardAddition {
  readonly segmentId: string
  readonly note: string | null
  readonly isSaving: boolean
  readonly errorMessage: string | null
  readonly onSubmit: (card: NewCard) => void
  readonly onClose: () => void
}

export interface CardChange {
  readonly segmentId: string
  readonly nodeId: string
  readonly isSaving: boolean
  readonly errorMessage: string | null
  readonly onSave: (content: CardContent) => void
  readonly onClose: () => void
}

export interface JourneyEditing {
  readonly authoringOf: (segmentId: string) => JourneyBandAuthoring
  readonly cardMovingOf: (segmentId: string) => CardMoving
  readonly cardAddition: CardAddition | null
  readonly cardChange: CardChange | null
}

interface AddedCard {
  readonly segmentId: string
  readonly lineEnd: LineEnd | null
}

const LINE_END_NOTE = "The line you drew ends at this card."

interface ModifiedCard {
  readonly segmentId: string
  readonly nodeId: string
}

const FORM_EDIT_KINDS: readonly DiagramEdit["kind"][] = ["add-card", "change-card", "describe"]

const isWrittenInForm = (edit: DiagramEdit): boolean => FORM_EDIT_KINDS.includes(edit.kind)

export const useJourneyEditing = (reviewKey: ReviewKey, onProblem: (message: string) => void): JourneyEditing => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [addedCard, setAddedCard] = useState<AddedCard | null>(null)
  const [modifiedCard, setModifiedCard] = useState<ModifiedCard | null>(null)
  const [describedSegmentIds, setDescribedSegmentIds] = useState<readonly string[]>([])
  const stopDescribing = (segmentId: string): void => {
    setDescribedSegmentIds((segmentIds) => segmentIds.filter((describedSegmentId) => describedSegmentId !== segmentId))
  }
  const editJourney = useMutation(
    trpc.review.editJourney.mutationOptions({
      onSuccess: async (editing, { segmentId, edit }) => {
        if (editing.kind === "rejected") {
          if (!isWrittenInForm(edit)) onProblem(editing.message)
          return
        }
        await Promise.all([
          queryClient.invalidateQueries(trpc.review.get.pathFilter()),
          queryClient.invalidateQueries(trpc.review.cardForm.pathFilter()),
          queryClient.invalidateQueries(trpc.review.cardBlocks.pathFilter()),
        ])
        if (edit.kind === "add-card") {
          setAddedCard(null)
          setModifiedCard(editing.nodeId === null ? null : { segmentId, nodeId: editing.nodeId })
        }
        if (edit.kind === "change-card") setModifiedCard(null)
        if (edit.kind === "describe") stopDescribing(segmentId)
      },
      onError: (error, { edit }) => {
        if (!isWrittenInForm(edit)) onProblem(error.message)
      },
    }),
  )
  const save = (segmentId: string, edit: DiagramEdit): void => {
    editJourney.mutate({ ...reviewKey, segmentId, edit })
  }
  const lastEdit: DiagramEdit | null = editJourney.variables?.edit ?? null
  const rejectionMessage = editJourney.data?.kind === "rejected" ? editJourney.data.message : null
  const failureMessage = rejectionMessage ?? editJourney.error?.message ?? null
  const isLastAddition = lastEdit?.kind === "add-card"
  const startAddition = (added: AddedCard): void => {
    if (isLastAddition) editJourney.reset()
    setAddedCard(added)
  }
  const isLastChange = lastEdit?.kind === "change-card"
  const isLastDescriptionOf = (segmentId: string): boolean => lastEdit?.kind === "describe" && editJourney.variables?.segmentId === segmentId

  return {
    cardMovingOf: (segmentId) => ({
      onMoveCards: (places) => { save(segmentId, { kind: "move-cards", places: [...places] }) },
    }),
    authoringOf: (segmentId) => ({
      board: {
        isPending: editJourney.isPending,
        onAddCard: () => { startAddition({ segmentId, lineEnd: null }) },
        onClearDiagram: () => { save(segmentId, { kind: "clear-diagram" }) },
        onRemoveDiagram: () => { save(segmentId, { kind: "remove-diagram" }) },
        onAddCardAtLineEnd: (lineEnd) => { startAddition({ segmentId, lineEnd: { ...lineEnd, places: [...lineEnd.places] } }) },
        onDrawLine: (line) => { save(segmentId, { kind: "add-line", ...line }) },
        onRemoveLine: (line) => { save(segmentId, { kind: "remove-line", ...line }) },
        onEditCard: (nodeId) => {
          if (isLastChange) editJourney.reset()
          setModifiedCard({ segmentId, nodeId })
        },
        onRemoveCard: (nodeId) => { save(segmentId, { kind: "remove-card", nodeId }) },
      },
      description: {
        isWriting: describedSegmentIds.includes(segmentId),
        isSaving: isLastDescriptionOf(segmentId) && editJourney.isPending,
        errorMessage: isLastDescriptionOf(segmentId) ? failureMessage : null,
        onEdit: () => {
          if (isLastDescriptionOf(segmentId)) editJourney.reset()
          setDescribedSegmentIds((segmentIds) => [...segmentIds, segmentId])
        },
        onSave: (markdown) => { save(segmentId, { kind: "describe", description: markdown }) },
        onCancel: () => {
          if (isLastDescriptionOf(segmentId)) editJourney.reset()
          stopDescribing(segmentId)
        },
      },
      onAddDiagram: () => { save(segmentId, { kind: "add-diagram" }) },
    }),
    cardAddition: addedCard === null
      ? null
      : {
          segmentId: addedCard.segmentId,
          note: addedCard.lineEnd === null ? null : LINE_END_NOTE,
          isSaving: isLastAddition && editJourney.isPending,
          errorMessage: isLastAddition ? failureMessage : null,
          onSubmit: (card) => {
            save(addedCard.segmentId, { kind: "add-card", ...card, ...(addedCard.lineEnd === null ? {} : { lineEnd: addedCard.lineEnd }) })
          },
          onClose: () => { setAddedCard(null) },
        },
    cardChange: modifiedCard === null
      ? null
      : {
          ...modifiedCard,
          isSaving: isLastChange && editJourney.isPending,
          errorMessage: isLastChange ? failureMessage : null,
          onSave: (content) => { save(modifiedCard.segmentId, { kind: "change-card", nodeId: modifiedCard.nodeId, ...content }) },
          onClose: () => { setModifiedCard(null) },
        },
  }
}
