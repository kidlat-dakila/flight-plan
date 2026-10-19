import { z } from "zod"
import { CODE_BLOCK_TYPES, type ASTCodeGroupGraph, type CodeBlock } from "@/code-graph/code-blocks"
import type { ImportGraphGroup } from "@/code-graph/import-graph"
import { configurations } from "./field-configuration"
import { ARTIFACT_STATUSES, CARD_SIDES, CONTEXT_CODE_BLOCK_KINDS, DIFF_TYPES, FINDING_KINDS, IMPACT_TYPES, LINE_MARKS } from "./kinds"
import type { TraceNode, Waypoint } from "./review-artifact"

const lineRangeSchema = z.strictObject({ lineStart: z.number().int(), lineEnd: z.number().int() })

export const artifactFindingSchema = z.strictObject({
  id: z.string(),
  kind: z
    .enum(FINDING_KINDS)
    .register(configurations, {
      version: 0.1,
      configurationType: "editable",
      _ui: {
        title: "Finding kind",
        description: "Choosing a finding's kind.",
      },
      fieldDescription: "walkthrough.files.waypoints.findings.kind.md",
      exampleValue: "bug",
      defaultInstruction: "walkthrough.files.waypoints.findings.kind.md",
      values: {
        bug: "walkthrough.files.waypoints.findings.kind.bug.md",
        risk: "walkthrough.files.waypoints.findings.kind.risk.md",
        nit: "walkthrough.files.waypoints.findings.kind.nit.md",
        question: "walkthrough.files.waypoints.findings.kind.question.md",
      },
    }),
  title: z
    .string()
    .register(configurations, {
      version: 0.1,
      configurationType: "editable",
      _ui: {
        title: "Finding title",
        description: "A finding's one-line heading.",
      },
      fieldDescription: "walkthrough.files.waypoints.findings.title.md",
      exampleValue: "A cancelled hold makes the stock negative",
      defaultInstruction: "walkthrough.files.waypoints.findings.title.md",
    }),
  reading: z
    .string()
    .register(configurations, {
      version: 0.1,
      configurationType: "editable",
      _ui: {
        title: "Finding reading",
        description: "The defect, one linked claim at a time.",
      },
      fieldDescription: "walkthrough.files.waypoints.findings.reading.md",
      exampleValue: "[`availableUnits()`](code:src/inventory/stock-level.ts#availableUnits) subtracts a hold that was already released.",
      defaultInstruction: "walkthrough.files.waypoints.findings.reading.md",
    }),
  trace: z
    .array(z.string())
    .register(configurations, {
      version: 0.1,
      configurationType: "editable",
      _ui: {
        title: "Finding trace",
        description: "The steps that prove a finding.",
      },
      fieldDescription: "walkthrough.files.waypoints.findings.trace.md",
      exampleValue: "A customer cancels a held order, and the job writes `held = -1`.",
      defaultInstruction: "walkthrough.files.waypoints.findings.trace.md",
    })
    .nullable(),
  solution: z
    .string()
    .register(configurations, {
      version: 0.1,
      configurationType: "editable",
      _ui: {
        title: "Finding solution",
        description: "The lines as they should be.",
      },
      fieldDescription: "walkthrough.files.waypoints.findings.solution.md",
      exampleValue: "  return stock - Math.max(held, 0)",
      defaultInstruction: "walkthrough.files.waypoints.findings.solution.md",
    })
    .nullable(),
})

const isReference = (value: unknown): boolean => typeof value === "object" && value !== null

const codeBlockSchema = z.custom<CodeBlock>(isReference)

const RETIRED_CORE_CHANGE_KEY = "needsAttention"

const withCurrentWaypointKeys = (waypoint: unknown): unknown => {
  if (typeof waypoint !== "object" || waypoint === null || !(RETIRED_CORE_CHANGE_KEY in waypoint)) return waypoint
  const { [RETIRED_CORE_CHANGE_KEY]: coreChange, ...rest } = waypoint as Readonly<Record<string, unknown>>
  return { ...rest, coreChange }
}

const waypointSchema: z.ZodType<Waypoint> = z.lazy(() =>
  z.preprocess(withCurrentWaypointKeys, z.strictObject({
    id: z.string(),
    title: z
      .string()
      .register(configurations, {
        version: 0.1,
        configurationType: "editable",
        _ui: {
          title: "Waypoint title",
          description: "What was done, and to what.",
        },
        fieldDescription: "walkthrough.files.waypoints.title.md",
        exampleValue: "Subtracted held units from the available stock",
        defaultInstruction: "walkthrough.files.waypoints.title.md",
      })
      .nullable(),
    declaration: z.string(),
    codeBlocks: z.array(codeBlockSchema).default([]),
    reading: z
      .string()
      .register(configurations, {
        version: 0.1,
        configurationType: "editable",
        _ui: {
          title: "Waypoint reading",
          description: "What the author changed here, and what it is for.",
        },
        fieldDescription: "walkthrough.files.waypoints.reading.md",
        exampleValue: "The author made `availableUnits()` subtract the units other carts hold.",
        defaultInstruction: "walkthrough.files.waypoints.reading.md",
      }),
    coreChange: z
      .string()
      .register(configurations, {
        version: 0.1,
        configurationType: "editable",
        _ui: {
          title: "Waypoint core-change note",
          description: "Why a waypoint is one of the few to focus on.",
        },
        fieldDescription: "walkthrough.files.waypoints.coreChange.md",
        exampleValue: "Every checkout now depends on this subtraction.",
        defaultInstruction: "walkthrough.files.waypoints.coreChange.md",
      })
      .nullable(),
    findings: z
      .array(artifactFindingSchema)
      .register(configurations, {
        version: 0.1,
        configurationType: "editable",
        _ui: {
          title: "Waypoint findings",
          description: "Reporting what is wrong with a waypoint's code: where a finding lives, what each kind carries, and proving a bug.",
        },
        fieldDescription: "walkthrough.files.waypoints.findings.md",
        defaultInstruction: "walkthrough.files.waypoints.findings.md",
      }),
    children: z.array(waypointSchema),
    isRequired: z.boolean().default(false),
  })),
)

const lineSpanSchema = z.tuple([z.number().int(), z.number().int()])

const codeSpanSchema = z.strictObject({ line: z.number().int(), startColumn: z.number().int(), endColumn: z.number().int() })

const libraryNameSchema = z.strictObject({ specifier: z.string(), name: z.string() })

export const codeReferenceSchema = codeSpanSchema.extend({
  path: z.string(),
  lines: lineSpanSchema,
  isLibrary: z.boolean(),
  library: libraryNameSchema.optional(),
})

export const languageReferenceSchema = codeSpanSchema.extend({ name: z.string() })

export const codeUsageSchema = codeSpanSchema.extend({ path: z.string(), text: z.string() })

export const codeExportSchema = codeSpanSchema.extend({ lines: lineSpanSchema, usages: z.array(codeUsageSchema) })

const triggerLabelSchema = z.strictObject({
  label: z
    .string()
    .register(configurations, {
      version: 0.1,
      configurationType: "editable",
      _ui: {
        title: "Trace trigger label",
        description: "What an event or a data fetch of a node is, in the reader's terms.",
      },
      fieldDescription: "traceDiagram.nodes.triggerLabels.label.md",
      exampleValue: "A shopper clicks \"Place order\"",
      defaultInstruction: "traceDiagram.nodes.triggerLabels.label.md",
    })
    .nullable(),
  codeBlock: codeBlockSchema,
})

const blockLabelSchema = z.strictObject({
  label: z
    .string()
    .register(configurations, {
      version: 0.1,
      configurationType: "editable",
      _ui: {
        title: "Trace block label",
        description: "What an argument, a state, a hook, an effect or a step of a node is for, in the reader's terms.",
      },
      fieldDescription: "traceDiagram.nodes.blockLabels.label.md",
      exampleValue: "Sends the promo code the shopper typed",
      defaultInstruction: "traceDiagram.nodes.blockLabels.label.md",
    })
    .nullable(),
  codeBlock: codeBlockSchema,
})

const traceRowSchema = z.strictObject({
  id: z.string(),
  type: z.enum(CODE_BLOCK_TYPES),
  label: z.string().nullable(),
  lineStart: z.number().int(),
  lineEnd: z.number().int(),
})

const cardPositionSchema = z.strictObject({ x: z.number(), y: z.number() })

const traceNodeSchema: z.ZodType<TraceNode> = z.lazy(() =>
  z.strictObject({
    id: z.string(),
    type: z.enum(CODE_BLOCK_TYPES),
    label: z
      .string()
      .register(configurations, {
        version: 0.1,
        configurationType: "editable",
        _ui: {
          title: "Trace node label",
          description: "What a step on the path does.",
        },
        fieldDescription: "traceDiagram.nodes.label.md",
        exampleValue: "Refuses an order it cannot fulfil",
        defaultInstruction: "traceDiagram.nodes.label.md",
      })
      .nullable(),
    description: z
      .string()
      .register(configurations, {
        version: 0.1,
        configurationType: "editable",
        _ui: {
          title: "Trace node description",
          description: "How a step is reached, and what it runs next.",
        },
        fieldDescription: "traceDiagram.nodes.description.md",
        exampleValue: "When a shopper places an order, `placeOrder()` calls this function with the lines of the cart.",
        defaultInstruction: "traceDiagram.nodes.description.md",
      })
      .nullable(),
    codeBlocks: z.array(codeBlockSchema),
    diffCodeBlocks: z.array(codeBlockSchema),
    children: z.array(traceNodeSchema),
    triggerLabels: z.array(triggerLabelSchema),
    blockLabels: z.array(blockLabelSchema).default([]),
    rows: z.array(traceRowSchema).optional(),
    position: cardPositionSchema.optional(),
    isRequired: z.boolean().default(false),
  }),
)

export const traceDiagramSchema = z
  .strictObject({
    astCodeGroup: z.custom<ASTCodeGroupGraph>(isReference),
    importGraphGroup: z.custom<ImportGraphGroup>(Array.isArray),
    description: z
      .string()
      .register(configurations, {
        version: 0.1,
        configurationType: "editable",
        _ui: {
          title: "Trace Diagram description",
          description: "The caption of the diagram, in five sentences at most.",
        },
        fieldDescription: "traceDiagram.description.md",
        exampleValue: "When a shopper places an order, `<Checkout />` calls `placeOrder()`, which asks `stockOf()` for every line of the cart before it charges the card.",
        defaultInstruction: "traceDiagram.description.md",
      })
      .nullable()
      .default(null),
    traceNodes: z.array(traceNodeSchema),
    traceNodeEdges: z.array(
      z.strictObject({
        id: z.string(),
        from: z.string(),
        to: z.string(),
        fromRowId: z.string().optional(),
        toSide: z.enum(CARD_SIDES).optional(),
      }),
    ),
    isRequired: z.boolean().default(false),
  })
  .register(configurations, {
    version: 0.1,
    configurationType: "static",
    summary: "The Trace Diagram: what its nodes are, and what is yours to write on them.",
    fieldDescription: "traceDiagram.md",
  })

const blastEdgeSchema = z.strictObject({ importer: z.string(), imported: z.string() })

export const blastSchema = z
  .strictObject({
    nodes: z.array(
      z.strictObject({
        path: z.string(),
        diffType: z.enum(DIFF_TYPES).nullable(),
        impactType: z
          .enum(IMPACT_TYPES)
          .register(configurations, {
            version: 0.1,
            configurationType: "editable",
            _ui: {
              title: "Blast file impact type",
              description: "What the change does to a file it did not touch.",
            },
            fieldDescription: "blastDiagram.nodes.impactType.md",
            exampleValue: "behaviour-changes",
            defaultInstruction: "blastDiagram.nodes.impactType.md",
            values: {
              "breaks": "blastDiagram.nodes.impactType.breaks.md",
              "behaviour-changes": "blastDiagram.nodes.impactType.behaviour-changes.md",
              "unaffected": "blastDiagram.nodes.impactType.unaffected.md",
            },
          })
          .nullable(),
        impactReason: z
          .string()
          .register(configurations, {
            version: 0.1,
            configurationType: "editable",
            _ui: {
              title: "Blast file impact reason",
              description: "Why a file breaks or changes behaviour.",
            },
            fieldDescription: "blastDiagram.nodes.impactReason.md",
            exampleValue: "It shows the units left, and now shows a negative number when holds exceed the stock.",
            defaultInstruction: "blastDiagram.nodes.impactReason.md",
          })
          .nullable(),
        isRequired: z.boolean().default(false),
      }),
    ),
    edges: z.array(blastEdgeSchema),
    importBound: z
      .strictObject({
        nodes: z.array(z.strictObject({ path: z.string(), diffType: z.enum(DIFF_TYPES).nullable() })),
        edges: z.array(blastEdgeSchema),
      })
      .optional(),
  })
  .register(configurations, {
    version: 0.1,
    configurationType: "static",
    summary: "The Blast Diagram: which files to assess, and where to stop.",
    fieldDescription: "blastDiagram.md",
  })

const segmentSchema = z.strictObject({
  id: z
    .string()
    .register(configurations, {
      version: 0.1,
      configurationType: "static",
      summary: "A segment's id, and where to pass it.",
      fieldDescription: "id.md",
      exampleValue: "3f9a1c2e",
    }),
  title: z
    .string()
    .register(configurations, {
      version: 0.1,
      configurationType: "static",
      summary: "A segment's title: what the segment adds, modifies and removes, or the code a groundwork segment is for, written after the context.",
      fieldDescription: "title.md",
      exampleValue: "New EditOrderPage",
    }),
  changedPaths: z.array(z.string()),
  context: z
    .string()
    .register(configurations, {
      version: 0.1,
      configurationType: "editable",
      _ui: {
        title: "Context Section",
        description: "The Context Section: why the change matters, what it changes from outside and what changed inside.",
      },
      fieldDescription: "context.md",
      exampleValue: "A basket with an item that sold out a minute ago could still reach payment.",
      defaultInstruction: "context.md",
    }),
  traceDiagram: traceDiagramSchema.nullable(),
  blastDiagram: blastSchema.nullable(),
  isContextRequired: z.boolean().default(false),
  walkthrough: z
    .strictObject({
      files: z
        .array(
          z.strictObject({
            path: z.string(),
            waypoints: z
              .array(waypointSchema)
              .register(configurations, {
                version: 0.1,
                configurationType: "static",
                summary: "A waypoint's shape, and what the scaffold decided for you.",
                fieldDescription: "walkthrough.files.waypoints.md",
              }),
          }),
        )
        .register(configurations, {
          version: 0.1,
          configurationType: "static",
          summary: "File sections: what order, and why tests get none.",
          fieldDescription: "walkthrough.files.md",
        }),
    })
    .register(configurations, {
      version: 0.1,
      configurationType: "static",
      summary: "The Code Walkthrough: reading order.",
      fieldDescription: "walkthrough.md",
    }),
})

const contextCodeBlockSchema = z.strictObject({
  isRequired: z.boolean(),
  kind: z.enum(CONTEXT_CODE_BLOCK_KINDS).default("codebase"),
  codeBlock: codeBlockSchema.nullable(),
  specifier: z.string().nullable().default(null),
  name: z.string().nullable().default(null),
  description: z
    .string()
    .register(configurations, {
      version: 0.1,
      configurationType: "editable",
      _ui: {
        title: "Context code block description",
        description: "What a code block is, what it does and where the codebase uses it, for a reader who has not seen it.",
      },
      fieldDescription: "contextCodeBlocks.description.md",
      exampleValue: "`sum(x, y)` is a utility function that adds two amounts. It takes `x: number` and `y: number` and returns their total.",
      defaultInstruction: "contextCodeBlocks.description.md",
    })
    .nullable(),
})

export const reviewArtifactSchema = z.strictObject({
  title: z.string(),
  status: z.enum(ARTIFACT_STATUSES),
  commit: z.string(),
  isSegmented: z.boolean(),
  segments: z.array(segmentSchema),
  sources: z.array(
    z.strictObject({
      path: z.string(),
      language: z.string(),
      lines: z.array(
        z.strictObject({
          text: z.string(),
          mark: z.enum(LINE_MARKS),
          number: z.number().int().nullable(),
        }),
      ),
      declarations: z.record(z.string(), lineRangeSchema),
      references: z.array(codeReferenceSchema),
      languageReferences: z.array(languageReferenceSchema).default([]),
      exports: z.array(codeExportSchema).default([]),
    }),
  ),
  contextCodeBlocks: z
    .array(contextCodeBlockSchema)
    .register(configurations, {
      version: 0.1,
      configurationType: "static",
      summary: "Context code blocks: the code a reader opens by hovering a name, and which of them need a description.",
      fieldDescription: "contextCodeBlocks.md",
    })
    .default([]),
  changedPaths: z.array(z.string()),
})
