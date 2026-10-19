import { z } from "zod"
import { CARD_SIDES, CODE_BLOCK_TYPES } from "@flightplan/configurations"

const lineNumber = z.number().int().positive()

const cardRowSchema = z.strictObject({
  id: z.string().nullable(),
  type: z.enum(CODE_BLOCK_TYPES),
  label: z.string(),
  lineStart: lineNumber,
  lineEnd: lineNumber,
})

const cardSourceSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("block"), blockId: z.string() }),
  z.strictObject({ kind: z.literal("lines"), lineStart: lineNumber, lineEnd: lineNumber }),
])

const cardPlaceSchema = z.strictObject({ nodeId: z.string(), x: z.number(), y: z.number() })

const lineEndSchema = z.strictObject({
  from: z.string(),
  fromRowId: z.string(),
  position: z.strictObject({ x: z.number(), y: z.number() }),
  places: z.array(cardPlaceSchema),
})

export const diagramEditSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("add-diagram") }),
  z.strictObject({ kind: z.literal("remove-diagram") }),
  z.strictObject({ kind: z.literal("clear-diagram") }),
  z.strictObject({ kind: z.literal("describe"), description: z.string() }),
  z.strictObject({ kind: z.literal("move-cards"), places: z.array(cardPlaceSchema).min(1) }),
  z.strictObject({ kind: z.literal("add-line"), from: z.string(), fromRowId: z.string(), to: z.string(), toSide: z.enum(CARD_SIDES) }),
  z.strictObject({ kind: z.literal("remove-line"), edgeId: z.string(), from: z.string(), to: z.string() }),
  z.strictObject({ kind: z.literal("remove-card"), nodeId: z.string() }),
  z.strictObject({
    kind: z.literal("add-card"),
    path: z.string().min(1),
    source: cardSourceSchema,
    isPrefilled: z.boolean(),
    hasChildComponents: z.boolean(),
    lineEnd: lineEndSchema.optional(),
  }),
  z.strictObject({
    kind: z.literal("change-card"),
    nodeId: z.string(),
    label: z.string(),
    description: z.string(),
    rows: z.array(cardRowSchema),
  }),
])

export const editTraceInputSchema = z.strictObject({
  repositoryName: z.string(),
  targetId: z.string(),
  segmentId: z.string(),
  edit: diagramEditSchema,
})

export const traceEditingSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("saved"), nodeId: z.string().nullable() }),
  z.strictObject({ kind: z.literal("rejected"), message: z.string() }),
])

export type DiagramEdit = z.infer<typeof diagramEditSchema>
export type CardRowEdit = z.infer<typeof cardRowSchema>
export type CardPlace = z.infer<typeof cardPlaceSchema>
export type LineEnd = z.infer<typeof lineEndSchema>
export type EditTraceInput = z.infer<typeof editTraceInputSchema>
export type TraceEditing = z.infer<typeof traceEditingSchema>
