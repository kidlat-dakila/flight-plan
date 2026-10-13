import { z } from "zod"
import { reviewTargetShape, segmentIdShape } from "@/procedures/read-artifact/utils/schemas"
import { WORK_KINDS, type WorkTally } from "@/procedures/read-artifact/utils/unwritten-work"
import type { NodeItem } from "./node-items"

export const readNodesInputShape = {
  ...reviewTargetShape,
  ids: z
    .array(z.string().min(1))
    .min(1)
    .optional()
    .describe("Waypoint ids, File Section paths, Journey Flow Diagram node ids, or the paths of Blast Diagram files. A Journey Flow Diagram node comes back alone, without the nodes inside it. Omit to ask for `unfilled`."),
  unfilled: z.boolean().optional().describe("Return the next items that still need writing."),
  needs: z
    .array(z.enum(WORK_KINDS))
    .min(1)
    .optional()
    .describe("For `unfilled`: only these kinds of work. `impact` is a file of the Blast Diagram nobody assessed; `label` is a Journey Flow Diagram node still showing its declaration's name; `trigger-label` is an event or a data fetch of a node with no label; `block-label` is an argument, a state, a hook, an effect or a step of a node with no label; `journey-description` is a Journey Flow Diagram with no description, handed out with its nodes and edges."),
  segmentId: segmentIdShape,
  limit: z.number().int().positive().optional().describe("For `unfilled`: how many to return. Default 10."),
  maxLines: z.number().int().positive().optional().describe("Most lines of code per item. Default 120. The rest is counted, not sent."),
}

export const readNodesInputSchema = z.strictObject(readNodesInputShape)

export type ReadNodesInput = z.infer<typeof readNodesInputSchema>

export type NodesReading
  = | { readonly kind: "selected", readonly items: readonly NodeItem[] }
    | { readonly kind: "unfilled", readonly items: readonly NodeItem[], readonly total: number, readonly remaining: number, readonly unwritten: WorkTally }
    | { readonly kind: "rejected", readonly message: string }
