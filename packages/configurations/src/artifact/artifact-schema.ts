import { z } from "zod"
import { configurations } from "./field-configuration"
import {
  ARTIFACT_STATUSES,
  CONNECTION_CERTAINTIES,
  CONNECTION_KINDS,
  ENTRY_POINT_TRIGGERS,
  FINDING_KINDS,
  LINE_MARKS,
  CHANGE_TYPES,
  NODE_CATEGORIES,
  WRITTEN_VERDICTS,
} from "./kinds"
import type { Waypoint } from "./review-artifact"

const lineRangeSchema = z.strictObject({ lineStart: z.number().int(), lineEnd: z.number().int() })

const findingSchema = z.strictObject({
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

const waypointSchema: z.ZodType<Waypoint> = z.lazy(() =>
  z.strictObject({
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
    needsAttention: z
      .string()
      .register(configurations, {
        version: 0.1,
        configurationType: "editable",
        _ui: {
          title: "Waypoint needs-attention note",
          description: "Why a waypoint is one of the few to focus on.",
        },
        fieldDescription: "walkthrough.files.waypoints.needsAttention.md",
        exampleValue: "Every checkout now depends on this subtraction.",
        defaultInstruction: "walkthrough.files.waypoints.needsAttention.md",
      })
      .nullable(),
    findings: z
      .array(findingSchema)
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
  }),
)

const tracedLineSchema = z.strictObject({ line: z.number().int(), text: z.string(), isChanged: z.boolean() })

const tracedNameSchema = z.strictObject({ name: z.string(), changeType: z.enum(CHANGE_TYPES), reference: z.tuple([z.number().int(), z.number().int()]) })

const tracedEventSchema = tracedNameSchema.extend({ nodeId: z.string().nullable() })

const lineSpanSchema = z.tuple([z.number().int(), z.number().int()])

const componentReturnSchema = z.strictObject({
  id: z.string(),
  statement: z.string(),
  reference: lineSpanSchema,
  changeType: z.enum(CHANGE_TYPES),
  isAdded: z.boolean(),
  label: z.string().nullable(),
  description: z.string().nullable(),
  tracedLines: z.array(tracedLineSchema),
  renderedNodeIds: z.array(z.string()),
})

const traceEndSchema = z.strictObject({
  path: z.string(),
  line: z.number().int(),
  text: z.string(),
  event: z.string().nullable(),
  element: z.string().nullable(),
  library: z.string().nullable(),
})

const journeyNodeSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("entry-point"),
    id: z.string(),
    trigger: z.enum(ENTRY_POINT_TRIGGERS),
    label: z.string(),
    description: z.string().nullable(),
    traceEnd: traceEndSchema.nullable(),
  }),
  z.strictObject({
    kind: z.literal("declaration"),
    id: z.string(),
    path: z.string(),
    declaration: z.string(),
    changeType: z.enum(CHANGE_TYPES),
    isAdded: z.boolean(),
    category: z
      .enum(NODE_CATEGORIES)
      .register(configurations, {
        version: 0.1,
        configurationType: "static",
        summary: "A node's visual category, and what each one means.",
        fieldDescription: "journey.nodes.category.md",
        exampleValue: "guard",
      }),
    label: z
      .string()
      .register(configurations, {
        version: 0.1,
        configurationType: "editable",
        _ui: {
          title: "Journey node label",
          description: "What a step on the path does.",
        },
        fieldDescription: "journey.nodes.label.md",
        exampleValue: "Refuses an order it cannot fulfil",
        defaultInstruction: "journey.nodes.label.md",
      })
      .nullable(),
    description: z
      .string()
      .register(configurations, {
        version: 0.1,
        configurationType: "editable",
        _ui: {
          title: "Journey node description",
          description: "How a step does it, and why it is on the path.",
        },
        fieldDescription: "journey.nodes.description.md",
        exampleValue: "Reads every level in one query and collects every short line.",
        defaultInstruction: "journey.nodes.description.md",
      })
      .nullable(),
    tracedLines: z.array(tracedLineSchema),
    events: z.array(tracedEventSchema),
    data: z.array(tracedNameSchema),
    returns: z.array(componentReturnSchema),
  }),
])

export const journeyFlowSchema = z
  .strictObject({
    id: z.string(),
    title: z.string(),
    nodes: z.array(journeyNodeSchema),
    edges: z.array(
      z.strictObject({
        from: z.string(),
        to: z.string(),
        kind: z.enum([...CONNECTION_KINDS, "trigger"]),
        certainty: z.enum(CONNECTION_CERTAINTIES),
        through: z.array(z.string()),
      }),
    ),
  })
  .register(configurations, {
    version: 0.1,
    configurationType: "static",
    summary: "The Journey Flow Diagram: what its nodes are, and what is yours to write on them.",
    fieldDescription: "journey.md",
  })

export const blastSchema = z
  .strictObject({
    nodes: z.array(
      z.strictObject({
        id: z.string(),
        ring: z.number().int(),
        path: z.string(),
        declaration: z.string(),
        label: z
          .string()
          .register(configurations, {
            version: 0.1,
            configurationType: "editable",
            _ui: {
              title: "Blast node label",
              description: "What a declaration on the Blast Diagram is.",
            },
            fieldDescription: "blast.nodes.label.md",
            exampleValue: "The stock a shopper can still buy",
            defaultInstruction: "blast.nodes.label.md",
          })
          .nullable(),
        contract: z
          .strictObject({
            before: z
              .string()
              .register(configurations, {
                version: 0.1,
                configurationType: "editable",
                _ui: {
                  title: "Contract before the change",
                  description: "The surface before the change.",
                },
                fieldDescription: "blast.nodes.contract.before.md",
                exampleValue: "Returns the stock of a SKU.",
                defaultInstruction: "blast.nodes.contract.before.md",
              })
              .nullable(),
            now: z
              .string()
              .register(configurations, {
                version: 0.1,
                configurationType: "editable",
                _ui: {
                  title: "Contract after the change",
                  description: "The surface after the change.",
                },
                fieldDescription: "blast.nodes.contract.now.md",
                exampleValue: "Returns the stock of a SKU minus the units held of it.",
                defaultInstruction: "blast.nodes.contract.now.md",
              }),
          })
          .register(configurations, {
            version: 0.1,
            configurationType: "static",
            summary: "A changed declaration's surface, before and now.",
            fieldDescription: "blast.nodes.contract.md",
          })
          .nullable(),
        verdict: z
          .enum(WRITTEN_VERDICTS)
          .register(configurations, {
            version: 0.1,
            configurationType: "editable",
            _ui: {
              title: "Blast node verdict",
              description: "What the change does to a dependent.",
            },
            fieldDescription: "blast.nodes.verdict.md",
            exampleValue: "behaviour-changes",
            defaultInstruction: "blast.nodes.verdict.md",
            values: {
              "breaks": "blast.nodes.verdict.breaks.md",
              "behaviour-changes": "blast.nodes.verdict.behaviour-changes.md",
              "unaffected": "blast.nodes.verdict.unaffected.md",
            },
          })
          .nullable(),
        effect: z
          .string()
          .register(configurations, {
            version: 0.1,
            configurationType: "editable",
            _ui: {
              title: "Blast node effect",
              description: "The one line of evidence for a verdict.",
            },
            fieldDescription: "blast.nodes.effect.md",
            exampleValue: "A reservation is now refused while another cart holds the last unit.",
            defaultInstruction: "blast.nodes.effect.md",
          })
          .nullable(),
      }),
    ),
    edges: z.array(
      z.strictObject({
        from: z.string(),
        to: z.string(),
        kind: z.enum(CONNECTION_KINDS),
        certainty: z.enum(CONNECTION_CERTAINTIES),
      }),
    ),
  })
  .register(configurations, {
    version: 0.1,
    configurationType: "static",
    summary: "The Blast Diagram: how far to assess, and what a verdict means.",
    fieldDescription: "blast.md",
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
      summary: "A segment's title: a very short text of its context, written after the context.",
      fieldDescription: "title.md",
      exampleValue: "Stock check",
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
  journey: journeyFlowSchema.nullable(),
  blast: blastSchema.nullable(),
  walkthrough: z
    .strictObject({
      intro: z
        .string()
        .register(configurations, {
          version: 0.1,
          configurationType: "editable",
          _ui: {
            title: "Code Walkthrough intro",
            description: "The one line that frames the whole tour.",
          },
          fieldDescription: "walkthrough.intro.md",
          exampleValue: "The stock check first, then the checkout that relies on it.",
          defaultInstruction: "walkthrough.intro.md",
        })
        .nullable(),
      files: z
        .array(
          z.strictObject({
            path: z.string(),
            title: z
              .string()
              .register(configurations, {
                version: 0.1,
                configurationType: "editable",
                _ui: {
                  title: "File Section title",
                  description: "What the reviewer is shown in one file.",
                },
                fieldDescription: "walkthrough.files.title.md",
                exampleValue: "Held units leave the available stock",
                defaultInstruction: "walkthrough.files.title.md",
              }),
            summary: z
              .array(z.string())
              .register(configurations, {
                version: 0.1,
                configurationType: "static",
                summary: "The changes the context names for this file.",
                fieldDescription: "walkthrough.files.summary.md",
                exampleValue: "Subtracts held units in [`availableUnits()`](code:src/inventory/stock-level.ts#availableUnits).",
              }),
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
    }),
  ),
  changedPaths: z.array(z.string()),
})
