/**
 * The artifact the MCP writes, mirrored as a Zod schema with a configuration on
 * every field.
 *
 * `ArtifactSchema` is the authored-input shape — what the agent writes, field
 * for field, with the same names, nesting, arrays and enums the MCP stores. It
 * is the single source of truth: it validates the input (strict objects, string
 * and array bounds) and carries, inline as Zod metadata in `configurations`, the
 * guidance the agent fills each field against.
 *
 * Cross-field, relational and completeness rules that Zod cannot express — a
 * `question` carrying no solution, an edge naming a node that exists, a finished
 * document having a tour — stay in the imperative checkers (`checkDocument`,
 * `checkComplete`, `checkDiagram`, `checkBlast`). Keeping those out of the schema
 * is what lets `ArtifactSchema` stay a plain object whose `.shape` the settings
 * screen can walk.
 *
 * Read a field's guidance with `configurations.get(schema)`: `version`, whether the
 * agent authors it (`configurationType`), the prose it follows, the `_ui` an
 * editable field renders with, and — on an enum — `values`, one line per option.
 *
 * `writingStyle` is the one configuration that is not a field: it is the voice all
 * prose shares. The recursive nodes (`waypoint`, `diagramNode`) are the only
 * shapes named apart from `ArtifactSchema`, because a schema cannot nest inside
 * itself inline.
 */

import { z } from "zod"

/** Guidance attached to one artifact field. */
export type FieldConfiguration = {
  version: number
  /**
   * Path to the markdown that tells the agent WHAT this field is — its shape,
   * what it means, and example values (how to write it, for an editable field).
   * Shipped and fixed; the same for every profile. Read from `field_descriptions/`.
   */
  fieldDescription: string
  /**
   * An example value for this one field — a primitive (string, number or
   * boolean), never an object. A container's example is assembled from its
   * leaves' `exampleValue`s, so only leaves carry one. It is the single source
   * of the example the MCP shows, so the description prose and the example
   * cannot drift.
   */
  exampleValue?: string | number | boolean
  /**
   * A literal example for a structural field whose shape cannot be assembled
   * from registered leaves — `sources`, a `code` fence, `meta`. Returned
   * verbatim by the example builder. Only for static fields the agent never
   * authors, so there is no how-to prose for it to drift against.
   */
  exampleOverride?: unknown
  /**
   * One meaning per option, on an enum field. On an editable field each is a
   * path into `default_instructions/`, editable per profile like the field's
   * own instruction. On a static field it is a path into `field_descriptions/`
   * or an inline one-liner.
   */
  values?: Record<string, string>
} & (
  | {
      /** The agent authors this field, and the settings screen renders it. */
      configurationType: "editable"
      /** How the settings screen renders this field. Required on an editable field. */
      _ui: { title: string; description: string }
      /**
       * Path to the markdown the agent follows to write this field. User-editable
       * per profile; read from `default_instructions/`. Only editable fields have
       * one — a static field is not authored, so it has nothing to instruct.
       */
      defaultInstruction: string
    }
  | {
      /** A structural or derived field the scaffold, diff or resolver owns; not rendered. */
      configurationType: "static"
      _ui?: undefined
    }
)

/** The registry holding every field's `FieldConfiguration`. */
export const configurations = z.registry<FieldConfiguration>()

/**
 * The voice and surfaces all prose shares. Not a field of the artifact, so it is
 * a configuration on its own rather than an entry in the registry.
 */
export const writingStyle: FieldConfiguration = {
  version: 0.1,
  configurationType: "editable",
  _ui: {
    title: "Writing style",
    description: "The shared voice every piece of Flight Plan prose follows.",
  },
  fieldDescription: "writingStyle/writingStyle.md",
  defaultInstruction: "writingStyle/writingStyle.md",
}

/**
 * The fixed part of the writing style: the CodeLink format, always in force and
 * not user-editable. Like a static field, it has a description and no
 * instruction — it is a rule the agent follows, not prose it authors. Served
 * beside `writingStyle` so a profile can change the voice but never the way code
 * is referenced.
 */
export const staticWritingStyle: FieldConfiguration = {
  version: 0.1,
  configurationType: "static",
  fieldDescription: "staticWritingStyle/staticWritingStyle.md",
}

/**
 * The document's own shape, and what a write is refused for.
 *
 * Standalone like the two above, because it belongs to no field: the skeleton
 * spans every field and a refusal list spans every rule. It was folded into
 * `staticWritingStyle` for a while, which made that entry two things at once —
 * the way code is referenced, and the shape of the document — and meant an
 * agent fetching the link format was handed the whole format with it.
 *
 * Fetched like anything else. Nothing is served before it is asked for.
 */
export const documentFormat: FieldConfiguration = {
  version: 0.1,
  configurationType: "static",
  fieldDescription: "documentFormat/documentFormat.md",
}

// Structural addresses and fences: types only, no configurations to author.
const lineRange = z.union([
  z.tuple([z.number(), z.number()]),
  z.object({ from: z.number(), to: z.number() }).strict(),
])
const source = z
  .object({
    path: z.string().min(1),
    lines: lineRange.optional(),
    anchor: z.string().min(1).optional(),
  })
  .strict()
const fence = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("ref"),
      lang: z.string().min(1),
      path: z.string().min(1),
      target: z.union([
        z.object({ symbol: z.string().min(1) }).strict(),
        z.object({ focus: lineRange }).strict(),
      ]),
      covers: z.array(z.number().int().min(0)).optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("proposal"),
      lang: z.string().min(1),
      path: z.string().min(1),
      position: z.discriminatedUnion("kind", [
        z.object({ kind: z.literal("after"), line: z.number().int().positive() }).strict(),
        z.object({ kind: z.literal("before"), line: z.number().int().positive() }).strict(),
        z.object({ kind: z.literal("replace"), lines: lineRange }).strict(),
        z.object({ kind: z.literal("new") }).strict(),
      ]),
      body: z.string().min(1),
      marks: z.array(lineRange).optional(),
    })
    .strict(),
])

/**
 * A diagram node, and the nodes nested under it. Named because it nests inside
 * itself; every field's configuration is still written inline here.
 */
const diagramNode: z.ZodType = z.lazy(() =>
  z
    .object({
      id: z
        .string()
        .min(1)
        .register(configurations, {
          version: 0.1,
          configurationType: "static",
          fieldDescription: "diagram/diagram.code.nodes.node.id.md",
          exampleValue: "hasStock",
        }),
      type: z
        .enum(["guard", "logic", "data", "ui", "type", "config"])
        .register(configurations, {
          version: 0.1,
          configurationType: "static",
          fieldDescription: "diagram/diagram.code.nodes.node.type.md",
          exampleValue: "guard",
          values: {
            guard: "diagram/diagram.code.nodes.node.type.guard.md",
            logic: "diagram/diagram.code.nodes.node.type.logic.md",
            data: "diagram/diagram.code.nodes.node.type.data.md",
            ui: "diagram/diagram.code.nodes.node.type.ui.md",
            type: "diagram/diagram.code.nodes.node.type.type.md",
            config: "diagram/diagram.code.nodes.node.type.config.md",
          },
        }),
      label: z
        .string()
        .min(1)
        .register(configurations, {
          version: 0.1,
          configurationType: "editable",
          _ui: {
            title: "Diagram node label",
            description: "How to write the short label on a diagram node.",
          },
          fieldDescription: "diagram/diagram.code.nodes.node.label.md",
          exampleValue: "Refuses an order it cannot fulfil",
          defaultInstruction: "diagram/diagram.code.nodes.node.label.md",
        }),
      sublabel: z
        .string()
        .min(1)
        .register(configurations, {
          version: 0.1,
          configurationType: "editable",
          _ui: {
            title: "Diagram node sublabel",
            description: "How to write the identifier line beneath a node.",
          },
          fieldDescription: "diagram/diagram.code.nodes.node.sublabel.md",
          exampleValue: "hasStock()",
          defaultInstruction: "diagram/diagram.code.nodes.node.sublabel.md",
        })
        .optional(),
      changed: z
        .boolean()
        .register(configurations, {
          version: 0.1,
          configurationType: "static",
          fieldDescription: "diagram/diagram.code.nodes.node.changed.md",
          exampleValue: true,
        })
        .optional(),
      description: z
        .string()
        .min(1)
        .register(configurations, {
          version: 0.1,
          configurationType: "editable",
          _ui: {
            title: "Diagram node description",
            description: "How to explain what a node does, then why it is on the path.",
          },
          fieldDescription: "diagram/diagram.code.nodes.node.description.md",
          exampleValue: "**The change.** Reads every level in one query and collects every short line.",
          defaultInstruction: "diagram/diagram.code.nodes.node.description.md",
        })
        .optional(),
      sources: z
        .array(source)
        .register(configurations, {
          version: 0.1,
          configurationType: "static",
          fieldDescription: "diagram/diagram.code.nodes.node.sources.md",
          exampleOverride: [{ path: "src/checkout/hasStock.ts", lines: [145, 163] }],
        })
        .optional(),
      edges: z
        .array(
          z
            .object({
              target: z
                .string()
                .min(1)
                .register(configurations, {
                  version: 0.1,
                  configurationType: "static",
                  fieldDescription: "diagram/diagram.code.nodes.node.edges.node.target.md",
                  exampleValue: "placeOrder",
                }),
              label: z
                .string()
                .min(1)
                .register(configurations, {
                  version: 0.1,
                  configurationType: "editable",
                  _ui: {
                    title: "Diagram edge label",
                    description: "How to say what crosses an edge, and when to leave it off.",
                  },
                  fieldDescription: "diagram/diagram.code.nodes.node.edges.node.label.md",
                  exampleValue: "one read",
                  defaultInstruction:
                    "diagram/diagram.code.nodes.node.edges.node.label.md",
                })
                .optional(),
              variant: z
                .enum(["default", "emphasis", "security", "dashed"])
                .register(configurations, {
                  version: 0.1,
                  configurationType: "static",
                  fieldDescription: "diagram/diagram.code.nodes.node.edges.node.variant.md",
                  exampleValue: "default",
                  values: {
                    default: "A plain grey line. Every edge is this unless it earns another.",
                    emphasis: "Accent colour, animated. The one edge the change is about.",
                    security: "Red. An untrusted value into the check that refuses it.",
                    dashed: "Broken line. Not a call in this flow: a test, a fallback.",
                  },
                })
                .optional(),
            })
            .strict(),
        )
        .register(configurations, {
          version: 0.1,
          configurationType: "static",
          fieldDescription: "diagram/diagram.code.nodes.node.edges.md",
        })
        .optional(),
      children: z
        .array(diagramNode)
        .register(configurations, {
          version: 0.1,
          configurationType: "static",
          fieldDescription: "diagram/diagram.code.nodes.node.children.md",
        })
        .optional(),
    })
    .strict(),
)

/**
 * A code-walkthrough waypoint, and the ones nested under it. Named because it
 * nests inside itself and is reused by a finding's solution.
 */
const waypoint: z.ZodType = z.lazy(() =>
  z
    .object({
      id: z
        .string()
        .min(1)
        .register(configurations, {
          version: 0.1,
          configurationType: "static",
          fieldDescription: "codeWalkthrough/codeWalkthrough.files.node.waypoints.node.id.md",
          exampleValue: "stock-guard",
        }),
      title: z
        .string()
        .min(1)
        .register(configurations, {
          version: 0.1,
          configurationType: "editable",
          _ui: {
            title: "Walkthrough waypoint title",
            description: "How to title a waypoint: what was done, and to what.",
          },
          fieldDescription: "codeWalkthrough/codeWalkthrough.files.node.waypoints.node.title.md",
          exampleValue: "Refuses an order it cannot fulfil",
          defaultInstruction: "codeWalkthrough/codeWalkthrough.files.node.waypoints.node.title.md",
        }),
      draft: z
        .literal(true)
        .register(configurations, {
          version: 0.1,
          configurationType: "static",
          fieldDescription: "codeWalkthrough/codeWalkthrough.files.node.waypoints.node.draft.md",
        })
        .optional(),
      reading: z
        .string()
        .min(1)
        .nullable()
        .register(configurations, {
          version: 0.1,
          configurationType: "editable",
          _ui: {
            title: "Walkthrough reading",
            description: "How to write the reading: what the author changed, and how it serves the pull request.",
          },
          fieldDescription: "codeWalkthrough/codeWalkthrough.files.node.waypoints.node.reading.md",
          exampleValue: "The author made `hasStock()` read every level in one query, so that [`placeOrder()`](code:src/checkout/placeOrder.ts#L22-40) names every short line in one refusal.",
          defaultInstruction: "codeWalkthrough/codeWalkthrough.files.node.waypoints.node.reading.md",
        }),
      needsAttention: z
        .string()
        .min(1)
        .register(configurations, {
          version: 0.1,
          configurationType: "editable",
          _ui: {
            title: "Needs attention",
            description:
              "How to say why a waypoint is where a reviewer should focus, and when it is worth saying.",
          },
          fieldDescription:
            "codeWalkthrough/codeWalkthrough.files.node.waypoints.node.needsAttention.md",
          exampleValue:
            "This is the rule the pull request exists for: stock is now checked against one read for the whole basket, and the other cards wire it in.",
          defaultInstruction:
            "codeWalkthrough/codeWalkthrough.files.node.waypoints.node.needsAttention.md",
        })
        .optional(),
      findings: z
        .array(
          z
            .object({
              id: z.string().min(1),
              kind: z.enum(["bug", "risk", "nit", "question"]),
              title: z.string().min(1),
              reading: z.string().min(1),
              trace: z.array(z.string().min(1)).min(1).optional(),
              solution: z
                .object({ lang: z.string().min(1), body: z.string().min(1) })
                .strict()
                .optional(),
            })
            .strict(),
        )
        .min(1)
        .register(configurations, {
          version: 0.1,
          configurationType: "editable",
          _ui: {
            title: "Waypoint findings",
            description:
              "How to report what is wrong with the code a waypoint shows, and when to report it.",
          },
          fieldDescription:
            "codeWalkthrough/codeWalkthrough.files.node.waypoints.node.findings.md",
          defaultInstruction:
            "codeWalkthrough/codeWalkthrough.files.node.waypoints.node.findings.md",
          exampleOverride: [
            {
              id: "negative-hold",
              kind: "bug",
              title: "A negative hold reads as available stock",
              reading:
                "[`hasStock()`](code:src/checkout/hasStock.ts#L145-163) subtracts the hold without checking its sign.",
              solution: {
                lang: "ts",
                body: "  const available = Math.max(level - Math.max(hold, 0), 0)",
              },
            },
          ],
        })
        .optional(),
      code: fence
        .nullable()
        .register(configurations, {
          version: 0.1,
          configurationType: "static",
          fieldDescription: "codeWalkthrough/codeWalkthrough.files.node.waypoints.node.code.md",
          exampleOverride: {
            kind: "ref",
            lang: "ts",
            path: "src/checkout/hasStock.ts",
            target: { symbol: "hasStock" },
            covers: [0],
          },
        }),
      children: z
        .array(waypoint)
        .register(configurations, {
          version: 0.1,
          configurationType: "static",
          fieldDescription: "codeWalkthrough/codeWalkthrough.files.node.waypoints.node.children.md",
        })
        .optional(),
    })
    .strict(),
)

/** The artifact the MCP writes, field for field, with each field's configuration inline. */
export const ArtifactSchema = z
  .object({
    schema: z
      .literal(1)
      .register(configurations, {
        version: 0.1,
        configurationType: "static",
        fieldDescription: "schema/schema.md",
      }),
    meta: z
      .discriminatedUnion("kind", [
        z
          .object({
            kind: z.literal("walkthrough"),
            repo: z.string().min(1),
            at: z.union([
              z.object({ pr: z.number().int().positive() }).strict(),
              z.object({ branch: z.string().min(1) }).strict(),
            ]),
            head: z.string().min(1),
            base: z.string().min(1).optional(),
            status: z.enum(["drafting", "complete"]).default("complete"),
          })
          .strict(),
        z
          .object({
            kind: z.literal("plan"),
            repo: z.string().min(1),
            name: z.string().min(1),
            branch: z.string().min(1).optional(),
            status: z.enum(["drafting", "complete"]).default("complete"),
          })
          .strict(),
      ])
      .register(configurations, {
        version: 0.1,
        configurationType: "static",
        fieldDescription: "meta/meta.md",
        exampleOverride: {
          kind: "walkthrough",
          repo: "acme/storefront",
          at: { pr: 412 },
          head: "4a12380",
          status: "complete",
        },
      }),
    title: z
      .string()
      .min(1)
      .register(configurations, {
        version: 0.1,
        configurationType: "static",
        fieldDescription: "title/title.md",
        exampleValue: "Refuse oversized stock queries",
      }),
    contextBody: z
      .object({
        context: z
          .string()
          .min(1)
          .register(configurations, {
            version: 0.1,
            configurationType: "editable",
            _ui: {
              title: "Context paragraph",
              description: "How to write the opening context: why the change matters.",
            },
            fieldDescription: "contextBody/contextBody.context.md",
            exampleValue: "A cancelled hold could push availability negative, so the guard let oversized orders through.",
            defaultInstruction: "contextBody/contextBody.context.md",
          }),
        overview: z
          .array(
            z
              .object({
                when: z
                  .string()
                  .min(1)
                  .register(configurations, {
                    version: 0.1,
                    configurationType: "editable",
                    _ui: {
                      title: "Overview scenario — “when”",
                      description: "How to phrase the situation, in the reader's terms.",
                    },
                    fieldDescription: "contextBody/contextBody.overview.node.when.md",
                    exampleValue: "a customer submits a basket with two lines out of stock",
                    defaultInstruction: "contextBody/contextBody.overview.node.when.md",
                  }),
                // biome-ignore lint/suspicious/noThenProperty: `then` is the artifact's own field name.
                then: z
                  .string()
                  .min(1)
                  .register(configurations, {
                    version: 0.1,
                    configurationType: "editable",
                    _ui: {
                      title: "Overview scenario — “then”",
                      description: "How to phrase what can then be observed.",
                    },
                    fieldDescription: "contextBody/contextBody.overview.node.then.md",
                    exampleValue: "the refusal names both out-of-stock lines",
                    defaultInstruction: "contextBody/contextBody.overview.node.then.md",
                  }),
              })
              .strict(),
          )
          .optional(),
        implementation: z
          .array(
            z
              .object({
                label: z
                  .string()
                  .min(1)
                  .register(configurations, {
                    version: 0.1,
                    configurationType: "editable",
                    _ui: {
                      title: "Implementation group label",
                      description: "How to label a group of changes by where they live.",
                    },
                    fieldDescription: "contextBody/contextBody.implementation.node.label.md",
                    exampleValue: "src/checkout/hasStock.ts",
                    defaultInstruction: "contextBody/contextBody.implementation.node.label.md",
                  }),
                path: z
                  .string()
                  .min(1)
                  .register(configurations, {
                    version: 0.1,
                    configurationType: "static",
                    fieldDescription: "contextBody/contextBody.implementation.node.path.md",
                    exampleValue: "src/checkout/hasStock.ts",
                  })
                  .optional(),
                items: z
                  .array(
                    z
                      .object({
                        text: z
                          .string()
                          .min(1)
                          .register(configurations, {
                            version: 0.1,
                            configurationType: "editable",
                            _ui: {
                              title: "Implementation item",
                              description: "How to write one change a reader would notice.",
                            },
                            fieldDescription: "contextBody/contextBody.implementation.node.items.node.text.md",
                            exampleValue: "Modified `hasStock()` to read every level once and collect every short line.",
                            defaultInstruction: "contextBody/contextBody.implementation.node.items.node.text.md",
                          }),
                      })
                      .strict(),
                  )
                  .min(1),
              })
              .strict(),
          )
          .optional(),
      })
      .strict(),
    diagram: z
      .object({
        type: z
          .literal("code")
          .register(configurations, {
            version: 0.1,
            configurationType: "static",
            fieldDescription: "diagram/diagram.code.type.md",
          }),
        title: z
          .string()
          .min(1)
          .register(configurations, {
            version: 0.1,
            configurationType: "editable",
            _ui: {
              title: "Diagram title",
              description: "How to title the diagram board.",
            },
            fieldDescription: "diagram/diagram.code.title.md",
            exampleValue: "How a checkout reaches the stock check",
            defaultInstruction: "diagram/diagram.code.title.md",
          })
          .optional(),
        nodes: z.array(diagramNode).optional(),
      })
      .strict(),
    blast: z
      .object({
        type: z
          .literal("blast")
          .register(configurations, {
            version: 0.1,
            configurationType: "static",
            fieldDescription: "blast/blast.blast.type.md",
          }),
        nodes: z.array(
          z
            .object({
              id: z
                .string()
                .min(1)
                .register(configurations, {
                  version: 0.1,
                  configurationType: "static",
                  fieldDescription: "blast/blast.blast.nodes.node.id.md",
                  exampleValue: "n12",
                }),
              label: z
                .string()
                .min(1)
                .register(configurations, {
                  version: 0.1,
                  configurationType: "static",
                  fieldDescription: "blast/blast.blast.nodes.node.label.md",
                  exampleValue: "levelsFor",
                }),
              sublabel: z
                .string()
                .min(1)
                .register(configurations, {
                  version: 0.1,
                  configurationType: "static",
                  fieldDescription: "blast/blast.blast.nodes.node.sublabel.md",
                  exampleValue: "src/inventory/levels.ts",
                })
                .optional(),
              hop: z
                .number()
                .int()
                .min(0)
                .register(configurations, {
                  version: 0.1,
                  configurationType: "static",
                  fieldDescription: "blast/blast.blast.nodes.node.hop.md",
                  exampleValue: 2,
                }),
              changeType: z
                .enum(["breaks", "behaviour-changes", "unaffected"])
                .register(configurations, {
                  version: 0.1,
                  configurationType: "editable",
                  _ui: {
                    title: "Blast change type",
                    description: "How to decide what the change does to a dependent.",
                  },
                  fieldDescription: "blast/blast.blast.nodes.node.changeType.md",
                  exampleValue: "behaviour-changes",
                  defaultInstruction: "blast/blast.blast.nodes.node.changeType.md",
                  values: {
                    breaks: "blast/blast.blast.nodes.node.changeType.breaks.md",
                    "behaviour-changes": "blast/blast.blast.nodes.node.changeType.behaviour-changes.md",
                    unaffected: "blast/blast.blast.nodes.node.changeType.unaffected.md",
                  },
                })
                .optional(),
              effect: z
                .string()
                .min(1)
                .register(configurations, {
                  version: 0.1,
                  configurationType: "editable",
                  _ui: {
                    title: "Blast effect",
                    description: "How to describe the change's effect on a dependent.",
                  },
                  fieldDescription: "blast/blast.blast.nodes.node.effect.md",
                  exampleValue: "omits `held`, so the new field never reaches it",
                  defaultInstruction: "blast/blast.blast.nodes.node.effect.md",
                })
                .optional(),
              contract: z
                .object({
                  before: z
                    .string()
                    .nullable()
                    .register(configurations, {
                      version: 0.1,
                      configurationType: "editable",
                      _ui: {
                        title: "Contract before",
                        description: "How to describe a dependent's surface before the change.",
                      },
                      fieldDescription: "blast/blast.blast.nodes.node.contract.before.md",
                      exampleValue: "took `{ productId, quantity }[]`",
                      defaultInstruction: "blast/blast.blast.nodes.node.contract.before.md",
                    }),
                  now: z
                    .string()
                    .min(1)
                    .register(configurations, {
                      version: 0.1,
                      configurationType: "editable",
                      _ui: {
                        title: "Contract after",
                        description: "How to describe a dependent's surface after the change.",
                      },
                      fieldDescription: "blast/blast.blast.nodes.node.contract.now.md",
                      exampleValue: "takes `{ productId, quantity, held? }[]`; callers that omit `held` see no change",
                      defaultInstruction: "blast/blast.blast.nodes.node.contract.now.md",
                    }),
                })
                .strict()
                .optional(),
              via: z
                .array(z.string().min(1))
                .register(configurations, {
                  version: 0.1,
                  configurationType: "static",
                  fieldDescription: "blast/blast.blast.nodes.node.via.md",
                  exampleValue: "n0",
                })
                .optional(),
            })
            .strict(),
        ),
        edges: z
          .array(
            z
              .object({
                source: z
                  .string()
                  .min(1)
                  .register(configurations, {
                    version: 0.1,
                    configurationType: "static",
                    fieldDescription: "blast/blast.blast.edges.node.source.md",
                    exampleValue: "n12",
                  }),
                target: z
                  .string()
                  .min(1)
                  .register(configurations, {
                    version: 0.1,
                    configurationType: "static",
                    fieldDescription: "blast/blast.blast.edges.node.target.md",
                    exampleValue: "n0",
                  }),
                kind: z
                  .enum(["call", "value-import", "re-export"])
                  .register(configurations, {
                    version: 0.1,
                    configurationType: "static",
                    fieldDescription: "blast/blast.blast.edges.node.kind.md",
                    exampleValue: "call",
                  }),
                label: z
                  .string()
                  .min(1)
                  .register(configurations, {
                    version: 0.1,
                    configurationType: "static",
                    fieldDescription: "blast/blast.blast.edges.node.label.md",
                    exampleValue: "levels",
                  })
                  .optional(),
              })
              .strict(),
          )
          .optional(),
      })
      .strict()
      .optional(),
    codeWalkthrough: z
      .object({
        note: z
          .string()
          .min(1)
          .register(configurations, {
            version: 0.1,
            configurationType: "editable",
            _ui: {
              title: "Walkthrough tour note",
              description: "How to write the note that frames the tour.",
            },
            fieldDescription: "codeWalkthrough/codeWalkthrough.note.md",
            exampleValue: "The guard first, then the query it leans on.",
            defaultInstruction: "codeWalkthrough/codeWalkthrough.note.md",
          })
          .optional(),
        files: z.array(
          z
            .object({
              path: z
                .string()
                .min(1)
                .register(configurations, {
                  version: 0.1,
                  configurationType: "static",
                  fieldDescription: "codeWalkthrough/codeWalkthrough.files.node.path.md",
                  exampleValue: "src/checkout/hasStock.ts",
                }),
              summary: z
                .array(z.string().min(1))
                .register(configurations, {
                  version: 0.1,
                  configurationType: "static",
                  fieldDescription: "codeWalkthrough/codeWalkthrough.files.node.summary.md",
                  exampleValue: "Modified `hasStock()` to collect every short line.",
                }),
              waypoints: z.array(waypoint),
              scaffolded: z
                .boolean()
                .register(configurations, {
                  version: 0.1,
                  configurationType: "static",
                  fieldDescription: "codeWalkthrough/codeWalkthrough.files.node.scaffolded.md",
                  exampleValue: true,
                })
                .optional(),
            })
            .strict(),
        ),
      })
      .strict(),
    findings: z
      .array(
        z
          .object({
            id: z
              .string()
              .min(1)
              .register(configurations, {
                version: 0.1,
                configurationType: "static",
                fieldDescription: "findings/findings.node.id.md",
                exampleValue: "f1",
              }),
            kind: z
              .enum(["bug", "risk", "nit", "question"])
              .register(configurations, {
                version: 0.1,
                configurationType: "editable",
                _ui: {
                  title: "Finding kind",
                  description: "How to choose which kind a finding is.",
                },
                fieldDescription: "findings/findings.node.kind.md",
                exampleValue: "bug",
                defaultInstruction: "findings/findings.node.kind.md",
                values: {
                  bug: "findings/findings.node.kind.bug.md",
                  risk: "findings/findings.node.kind.risk.md",
                  nit: "findings/findings.node.kind.nit.md",
                  question: "findings/findings.node.kind.question.md",
                },
              }),
            title: z
              .string()
              .min(1)
              .register(configurations, {
                version: 0.1,
                configurationType: "editable",
                _ui: {
                  title: "Finding title",
                  description: "How to write a finding's title: the code and what it does wrong.",
                },
                fieldDescription: "findings/findings.node.title.md",
                exampleValue: "`annotateRanges` drops the line mapping for the whole block",
                defaultInstruction: "findings/findings.node.title.md",
              }),
            reading: z
              .string()
              .min(1)
              .register(configurations, {
                version: 0.1,
                configurationType: "editable",
                _ui: {
                  title: "Finding reading",
                  description: "How to write the finding as linked prose.",
                },
                fieldDescription: "findings/findings.node.reading.md",
                exampleValue: "[The filter subtracts `reserved`](code:src/checkout/hasStock.ts#L155) without checking its sign.",
                defaultInstruction: "findings/findings.node.reading.md",
              }),
            trace: z
              .array(z.string().min(1))
              .min(1)
              .register(configurations, {
                version: 0.1,
                configurationType: "editable",
                _ui: {
                  title: "Finding trace",
                  description: "How to write the steps that prove a finding.",
                },
                fieldDescription: "findings/findings.node.trace.md",
                exampleValue: "A customer cancels a held order, and the sweeper writes `reserved = -1`.",
                defaultInstruction: "findings/findings.node.trace.md",
              })
              .optional(),
            code: fence
              .nullable()
              .register(configurations, {
                version: 0.1,
                configurationType: "static",
                fieldDescription: "findings/findings.node.code.md",
                exampleOverride: {
                  kind: "ref",
                  lang: "ts",
                  path: "src/checkout/hasStock.ts",
                  target: { focus: [155, 157] },
                },
              }),
            solution: z
              .object({ lang: z.string().min(1), body: z.string().min(1) })
              .strict()
              .register(configurations, {
                version: 0.1,
                configurationType: "editable",
                _ui: {
                  title: "Finding solution",
                  description: "How to write the fix a finding proposes for its lines.",
                },
                fieldDescription: "findings/findings.node.solution.md",
                defaultInstruction: "findings/findings.node.solution.md",
                exampleOverride: {
                  lang: "ts",
                  body: [
                    "  const reserved = holds.get(line.productId) ?? 0",
                    "  const available = level - Math.max(reserved, 0)",
                    "  return available >= line.quantity",
                  ].join("\n"),
                },
              })
              .optional(),
          })
          .strict(),
      )
      .min(1)
      .optional(),
  })
  .strict()

/*
 * Container fields — the objects and arrays that hold the leaves.
 *
 * Registered here, after the schema, rather than threaded through the inline
 * definitions: the registry keys on the node instance, so navigating to a
 * container and registering it is the same as an inline `.register`, without
 * the brace-matching. Every container is `static` — the agent assembles the
 * shape, it does not author prose for it — and carries a description that
 * explains the shape and shows an example.
 */
const unwrap = (node: z.ZodType): z.ZodType => {
  const def = (node as unknown as { def: { type: string; innerType?: z.ZodType } }).def
  return def.type === "optional" || def.type === "nullable" || def.type === "default"
    ? unwrap(def.innerType as z.ZodType)
    : node
}
const shapeOf = (node: z.ZodType) => (node as unknown as { shape: Record<string, z.ZodType> }).shape
const elementOf = (node: z.ZodType) => (node as unknown as { def: { element: z.ZodType } }).def.element
const shape = (node: z.ZodType, fieldDescription: string): void => {
  node.register(configurations, { version: 0.1, configurationType: "static", fieldDescription })
}

const top = shapeOf(ArtifactSchema)

const contextBodyNode = top.contextBody as z.ZodType
shape(contextBodyNode, "contextBody/contextBody.md")
const cb = shapeOf(contextBodyNode)
shape(unwrap(cb.overview as z.ZodType), "contextBody/contextBody.overview.md")
const implementation = unwrap(cb.implementation as z.ZodType)
shape(implementation, "contextBody/contextBody.implementation.md")
shape(shapeOf(elementOf(implementation)).items as z.ZodType, "contextBody/contextBody.implementation.items.md")

const diagramNodeShape = top.diagram as z.ZodType
shape(diagramNodeShape, "diagram/diagram.md")
shape(unwrap(shapeOf(diagramNodeShape).nodes as z.ZodType), "diagram/diagram.nodes.md")

const blastNode = unwrap(top.blast as z.ZodType)
shape(blastNode, "blast/blast.md")
const blastNodes = shapeOf(blastNode).nodes as z.ZodType
shape(blastNodes, "blast/blast.nodes.md")
shape(unwrap(shapeOf(elementOf(blastNodes)).contract as z.ZodType), "blast/blast.nodes.contract.md")
shape(unwrap(shapeOf(blastNode).edges as z.ZodType), "blast/blast.edges.md")

const codeWalkthroughNode = top.codeWalkthrough as z.ZodType
shape(codeWalkthroughNode, "codeWalkthrough/codeWalkthrough.md")
const files = shapeOf(codeWalkthroughNode).files as z.ZodType
shape(files, "codeWalkthrough/codeWalkthrough.files.md")
const waypoints = shapeOf(elementOf(files)).waypoints as z.ZodType
shape(waypoints, "codeWalkthrough/codeWalkthrough.files.waypoints.md")
// Every waypoint field lives inside the recursive `waypoint`, whose `z.lazy`
// getter builds a fresh node each call — so they are registered inline in the
// waypoint definition above, not navigated to here.

const findingsNode = unwrap(top.findings as z.ZodType)
shape(findingsNode, "findings/findings.md")

export type Artifact = z.infer<typeof ArtifactSchema>
