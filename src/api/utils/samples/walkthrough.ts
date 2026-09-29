import type { z } from "zod"
import {
  BLAST_EDGE_KINDS,
  CHANGE_TYPES,
  type BlastEdgeKind,
  type ChangeType,
} from "../../../lib/schemas/diagram/blast"
import {
  CODE_NODE_TYPES,
  EDGE_VARIANTS,
  type CodeNodeType,
  type EdgeVariant,
} from "../../../lib/schemas/diagram/schema"
import type { LineRange } from "../../../lib/schemas/document/primitives"
import { FINDING_KINDS, type documentInput, type FindingKind } from "../../../lib/schemas/document/schema"
import type { Hunk } from "../../../lib/schemas/document/stored"
import {
  BASE,
  HEAD,
  REPO,
  findSymbol,
  lineOf,
  linesOf,
  linkTo,
  linkToLine,
  spanOf,
  wholeOf,
} from "./files"

/**
 * The review walkthrough: every feature that can live in one document.
 *
 * Written in the **input** form, the shape an agent sends, and stored by the
 * same pipeline the server runs. So what the panel renders is exactly what an
 * agent's document would become, down to the `expect` lines and `sources`.
 *
 * The parts an enum names are generated from the enum. A table below gives the
 * hand-written version of each value; a value the table does not know yet gets
 * a generic one. So a new finding kind, node type, edge variant, change type or
 * blast edge kind shows up in the sample the day it is added, and the coverage
 * test never has to be taught about it.
 *
 * Features that exclude each other in one document — a diagram and no diagram
 * — are in `absent`, and unwritten cards are in the `drafting` steps.
 */

export type SampleInput = z.input<typeof documentInput>
type Waypoint = SampleInput["codeWalkthrough"]["files"][number]["waypoints"][number]
type DocFinding = NonNullable<SampleInput["findings"]>[number]

const pair = (range: LineRange): [number, number] => [range.from, range.to]

const at = (path: string, name: string): LineRange => {
  const found = findSymbol(path, name)
  if (found === null) throw new Error(`no \`${name}\` in \`${path}\``)
  return found
}

const PLACE = "src/checkout/placeOrder.ts"
const STOCK = "src/checkout/hasStock.ts"
const RESERVE = "src/checkout/reserve.ts"
const TYPES = "src/checkout/types.ts"
const ERRORS = "src/checkout/errors.ts"
const LEGACY = "src/checkout/legacyCart.ts"
const PRODUCTS = "src/catalog/products.ts"
const LEVELS = "src/inventory/levels.ts"
const BASKET = "src/checkout/Basket.tsx"
const CHARGE = "src/payments/chargeCard.ts"
const ORDERS = "src/api/orders.ts"
const INDEX = "src/checkout/index.ts"
const REFUNDS = "src/admin/refunds.ts"
const DAILY = "src/reports/daily.ts"
const EMAIL = "src/reports/email.ts"
const QUEUE = "src/jobs/queue.ts"

/**
 * What the pull request did to each file.
 *
 * `added` is in file order, which is what a waypoint's `covers` indexes. A
 * removal sits after the line named, in the new file's numbering.
 */
export const WALKTHROUGH_HUNKS: Record<string, Hunk> = {
  [PLACE]: {
    added: [
      spanOf(PLACE, `import { reserveStock`, `import { reserveStock`),
      spanOf(PLACE, "const reservation = await", "const reservation = await"),
      spanOf(PLACE, "  try {", "    throw cause"),
    ],
    removed: [
      {
        after: lineOf(PLACE, "const reservation = await"),
        lines: [
          "  const payment = await chargeCard(card, totalOf(basket))",
          "  return { id: payment.id, lines: basket.lines }",
        ],
      },
    ],
  },
  [STOCK]: {
    added: [spanOf(STOCK, ".filter((line)", ".filter((line)")],
    removed: [
      {
        after: lineOf(STOCK, ".filter((line)") - 1,
        lines: ["    .filter((line) => levels.get(line.productId) < line.quantity)"],
      },
    ],
  },
  [RESERVE]: { added: [wholeOf(RESERVE)], removed: [] },
  [TYPES]: { added: [spanOf(TYPES, "export type Order", "export type Order")], removed: [] },
  // Changed and cited by no waypoint, so the coverage bar has something to name.
  [ORDERS]: { added: [spanOf(ORDERS, "if (cause instanceof", "if (cause instanceof")], removed: [] },
}

/* ------------------------------------------------------------------------- */
/* Findings, one per kind                                                     */
/* ------------------------------------------------------------------------- */

/**
 * A document finding for each kind the schema has.
 *
 * Mixed on purpose: with and without a trace, with and without code, so every
 * shape a finding can take is drawn by some kind.
 */
const FINDING_TEXT: Partial<Record<FindingKind, () => Omit<DocFinding, "id" | "kind">>> = {
  bug: () => ({
    title: "A failed release leaves the stock held for ten minutes",
    reading: `When ${linkTo(RESERVE, "releaseStock")} throws, the original charge error is lost and the reservation stays until ${linkToLine(RESERVE, "RESERVATION_TTL_MS =", "`RESERVATION_TTL_MS`")} lapses.`,
    trace: [
      `The customer presses **Place order** in ${linkTo(BASKET, "BasketView", "`BasketView`")}.`,
      `${linkTo(CHARGE, "chargeCard")} rejects the card.`,
      `${linkToLine(PLACE, "await releaseStock(reservation)", "`releaseStock(reservation)`")} throws while the database is down, and replaces the charge error.`,
    ],
    code: { kind: "ref", lang: "ts", path: RESERVE, target: { symbol: "releaseStock" } },
    solution: {
      lang: "ts",
      body: [
        "export async function releaseStock(reservation: Reservation): Promise<void> {",
        "  // Retried once, so a blip does not hold the stock until the TTL lapses, and",
        "  // never thrown: a failed release must not replace the charge error.",
        "  for (let attempt = 0; attempt < 2; attempt += 1) {",
        "    try {",
        "      await db.reservations.delete(reservation.id)",
        "      return",
        "    } catch {",
        "      // Lapses on its own after RESERVATION_TTL_MS.",
        "    }",
        "  }",
        "}",
      ].join("\n"),
    },
  }),
  risk: () => ({
    title: "Refunds build an order without a reservation",
    reading: `${linkTo(REFUNDS, "refundOrder")} returns \`{ id, lines }\`, which no longer satisfies \`Order\`. It will not compile until it supplies one.`,
    code: { kind: "ref", lang: "ts", path: REFUNDS, target: { symbol: "refundOrder" } },
    solution: {
      lang: "ts",
      body: [
        "export function refundOrder(id: string, lines: Order[\"lines\"], reservation: string): Order {",
        "  return { id, lines, reservation }",
        "}",
      ].join("\n"),
    },
  }),
  nit: () => ({
    title: "`RESERVE_BEFORE_CHARGE` is read by nothing",
    reading: "The flag is declared and never consulted, so turning it off changes nothing. Remove it or read it.",
    code: null,
  }),
  question: () => ({
    title: "Should a declined card release the stock at once?",
    reading: "Today it does. A retry with another card then competes with other customers for the same items.",
    code: null,
  }),
}

function documentFindings(): DocFinding[] {
  return FINDING_KINDS.map((kind) => {
    const written = FINDING_TEXT[kind]
    const body = written?.() ?? {
      title: `A ${kind} nobody has written a sample for`,
      reading: `Generated for \`${kind}\`, which the sample has no hand-written text for yet.`,
      code: null,
    }
    return { id: `finding-${kind}`, kind, ...body }
  })
}

/* ------------------------------------------------------------------------- */
/* The tour                                                                   */
/* ------------------------------------------------------------------------- */

const ref = (path: string, target: { symbol: string } | { focus: LineRange }, covers?: number[]) => ({
  kind: "ref" as const,
  lang: path.endsWith(".tsx") ? "tsx" : "ts",
  path,
  target: "symbol" in target ? target : { focus: pair(target.focus) },
  ...(covers === undefined ? {} : { covers }),
})

/** The title the overview links to with `#slug`. See `HELD_SLUG`. */
const HELD_TITLE = "Stock is held before the card is charged"
/** What the renderer's `slugOf` makes of `HELD_TITLE`. */
export const HELD_SLUG = "stock-is-held-before-the-card-is-charged"

const tryBlock = spanOf(PLACE, "  try {", "    throw cause")

export function walkthroughFiles(): SampleInput["codeWalkthrough"]["files"] {
  const placeOrder: Waypoint[] = [
    {
      id: "held-before-charge",
      title: HELD_TITLE,
      reading: `The reservation now comes between the stock check and the charge. ${linkTo(PLACE, "placeOrder")} used to charge first and hope the stock was still there.`,
      code: ref(PLACE, { symbol: "placeOrder" }, [1, 2]),
      children: [
        {
          id: "reserve-after-check",
          title: "The reservation follows the check it depends on",
          reading: `Only a basket that ${linkTo(STOCK, "hasStock")} passed is reserved, so a reservation never holds stock that was already short.`,
          code: ref(PLACE, { focus: spanOf(PLACE, "const reservation = await", "const reservation = await") }, [1]),
        },
        {
          id: "release-on-failure",
          title: "A failed charge gives the stock back",
          reading: [
            `The \`catch\` releases before it rethrows, so the caller still sees the charge error.`,
            ``,
            `<details>`,
            `<summary>Why not \`finally\`</summary>`,
            ``,
            `A successful charge must keep the reservation. \`finally\` would release it on both paths.`,
            ``,
            `</details>`,
          ].join("\n"),
          needsAttention: "The other half of the rule this pull request adds: without this release, a declined card leaves the stock held.",
          findings: [
            {
              id: "release-masks-error",
              kind: "risk",
              title: "A throwing release hides why the charge failed",
              reading: `If ${linkTo(RESERVE, "releaseStock")} throws, the caller gets a database error instead of the declined card.`,
              trace: [
                `${linkTo(CHARGE, "chargeCard")} throws a declined card.`,
                `${linkToLine(PLACE, "await releaseStock(reservation)", "`releaseStock()`")} throws next, and its error propagates.`,
              ],
              solution: {
                lang: "ts",
                body: [
                  "  try {",
                  "    const payment = await chargeCard(card, totalOf(basket))",
                  "    return { id: payment.id, lines: basket.lines, reservation: reservation.id }",
                  "  } catch (cause) {",
                  "    await releaseStock(reservation).catch(() => undefined)",
                  "    throw cause",
                  "  }",
                ].join("\n"),
              },
            },
          ],
          code: ref(PLACE, { focus: tryBlock }, [2]),
        },
      ],
    },
    {
      id: "total-unchanged",
      title: "The total is computed as before",
      reading: `${linkTo(PLACE, "totalOf")} only widened its parameter, so the report can pass lines without a whole basket.`,
      code: ref(PLACE, { symbol: "totalOf" }),
    },
  ]

  const hasStock: Waypoint[] = [
    {
      id: "missing-level-is-zero",
      title: "A product with no stock row counts as none",
      reading: `\`levels.get\` returns \`undefined\` for a product the warehouse never stocked. The old comparison was false for it, so the line passed.`,
      findings: [
        {
          id: "unknown-product",
          kind: "question",
          title: "Should an unknown product refuse the order, or be dropped from it?",
          reading: "Both are defensible. Refusing is what this does now.",
        },
      ],
      code: ref(STOCK, { symbol: "hasStock" }, [0]),
    },
    {
      id: "levels-not-cached",
      title: "Levels are read fresh on every order",
      reading: "No cache sits in front of the stock table. A cache would reopen the window this change closes.",
      code: null,
    },
  ]

  const reserve: Waypoint[] = [
    {
      id: "reservation-lapses",
      title: "A reservation lapses on its own",
      reading: `Nothing sweeps expired rows yet: ${linkToLine(RESERVE, "RESERVATION_TTL_MS =", "`RESERVATION_TTL_MS`")} is only a promise the plan keeps.`,
      findings: [
        {
          id: "ttl-units",
          kind: "nit",
          title: "Name the unit once",
          reading: "The name says milliseconds and so does the arithmetic. One of them is enough.",
          solution: { lang: "ts", body: "export const RESERVATION_TTL = 10 * 60 * 1000 // ms" },
        },
      ],
      code: ref(RESERVE, { symbol: "RESERVATION_TTL_MS" }, [0]),
    },
    {
      id: "reserve-and-release",
      title: "Holding and releasing are one insert and one delete",
      reading: `${linkTo(RESERVE, "reserveStock")} and ${linkTo(RESERVE, "releaseStock")} touch one table each, so the pair cannot leave it half written.`,
      code: ref(RESERVE, { focus: spanOf(RESERVE, "export async function reserveStock", "await db.reservations.delete") }),
    },
  ]

  const types: Waypoint[] = [
    {
      id: "order-carries-reservation",
      title: "An order now names its reservation",
      reading: "The whole file, because the new field is only readable beside the two types it joins.",
      code: ref(TYPES, { focus: wholeOf(TYPES) }, [0]),
    },
  ]

  const legacy: Waypoint[] = [
    {
      id: "legacy-converts",
      title: "The old basket still converts",
      reading: "Unchanged, and cited because the mobile app is the one caller this change could surprise.",
      code: ref(LEGACY, { symbol: "fromLegacy" }),
    },
    {
      id: "legacy-detects",
      title: "Old bodies are recognised by their `items`",
      reading: "Cited so a reader can see the check the handler branches on. The mainline has renamed it since.",
      code: ref(LEGACY, { symbol: "isLegacy" }),
    },
  ]

  const levels: Waypoint[] = [
    {
      id: "levels-read",
      title: "Levels come from one query per basket",
      reading: "Cited for the query the stock check waits on.",
      code: ref(LEVELS, { symbol: "levelsFor" }),
    },
  ]

  const products: Waypoint[] = [
    {
      id: "product-lookup",
      title: "Prices come from the catalogue, not the basket",
      reading: "A long file, drawn as a window around the lookup rather than whole.",
      code: ref(PRODUCTS, { symbol: "productById" }),
    },
  ]

  const errors: Waypoint[] = [
    {
      id: "refusal-codes",
      title: "The customer is told which items were short",
      reading: "Its range opens on a blank line, so it carries no anchor to check.",
      code: ref(ERRORS, {
        focus: {
          from: lineOf(ERRORS, "export type OrderErrorCode") + 1,
          to: lineOf(ERRORS, "super(code)"),
        },
      }),
    },
  ]

  return [
    {
      path: PLACE,
      summary: [`Reserves stock with ${linkTo(RESERVE, "reserveStock")} before charging, and releases it when the charge fails.`],
      waypoints: placeOrder,
    },
    {
      path: STOCK,
      summary: ["Counts a product with no stock row as out of stock."],
      waypoints: hasStock,
    },
    { path: RESERVE, summary: ["Adds the reservation table's two operations."], waypoints: reserve },
    { path: TYPES, summary: ["Gives `Order` a required `reservation`."], waypoints: types },
    { path: LEGACY, summary: [], waypoints: legacy },
    { path: LEVELS, summary: [], waypoints: levels },
    { path: PRODUCTS, summary: [], waypoints: products },
    { path: ERRORS, summary: [], waypoints: errors },
  ]
}

/* ------------------------------------------------------------------------- */
/* The diagram                                                                */
/* ------------------------------------------------------------------------- */

type DiagramNode = {
  id: string
  type: CodeNodeType
  label: string
  sublabel?: string
  changed?: boolean
  description?: string
  escape?: boolean
  sources?: { path: string; lines?: [number, number]; anchor?: string }[]
  edges?: { target: string; label?: string; variant?: EdgeVariant; handoff?: boolean }[]
  children?: DiagramNode[]
}

const source = (path: string, name: string) => {
  const range = at(path, name)
  return { path, lines: pair(range), anchor: linesOf(path)[range.from - 1] ?? "" }
}

/** Which hand-written node carries each type. Any other type gets a generic one. */
const NODE_OF_TYPE: Record<string, string> = {
  ui: "submit",
  logic: "place",
  guard: "check",
  data: "reserve",
  type: "order",
  config: "ttl",
}

/** Which hand-written edge carries each variant. */
const EDGE_OF_VARIANT: Record<string, string> = {
  default: "place->order",
  emphasis: "check->reserve",
  security: "reserve->charge",
  dashed: "reserve->ttl",
}

export function walkthroughDiagram(): Record<string, unknown> & { type: "code" } {
  const charge: DiagramNode = {
    id: "charge",
    type: "logic",
    label: "Charges the card",
    sublabel: "chargeCard()",
    description: "Unchanged. It now runs only once the stock is held.",
    sources: [source(CHARGE, "chargeCard")],
    edges: [{ target: "queue", label: "follow-up jobs" }],
  }
  const reserve: DiagramNode = {
    id: "reserve",
    type: "data",
    label: "Holds the stock for ten minutes",
    sublabel: "reserveStock()",
    changed: true,
    description: `**New.** One insert into \`reservations\`, released by ${linkTo(RESERVE, "releaseStock")} when the charge fails.`,
    sources: [source(RESERVE, "reserveStock"), source(RESERVE, "releaseStock")],
    edges: [
      { target: "charge", label: "then charges", variant: "security" },
      { target: "ttl", label: "reads", variant: "dashed" },
    ],
    children: [charge],
  }
  const nodes: DiagramNode[] = [
    {
      id: "submit",
      type: "ui",
      label: "Sends the basket when the customer orders",
      sublabel: "BasketView",
      description: "Where the trace starts. The handler is handed to the form as a value.",
      sources: [source(BASKET, "BasketView")],
      edges: [{ target: "place", label: "onSubmit", handoff: true }],
    },
    {
      id: "place",
      type: "logic",
      label: "Orders the three steps",
      sublabel: "placeOrder()",
      changed: true,
      description: "**The change.** Reserve now sits between check and charge.",
      sources: [source(PLACE, "placeOrder")],
      edges: [{ target: "order", label: "returns", variant: "default" }],
      children: [
        {
          id: "check",
          type: "guard",
          label: "Refuses a basket that cannot ship",
          sublabel: "hasStock()",
          changed: true,
          sources: [source(STOCK, "hasStock")],
          edges: [{ target: "reserve", label: "in stock", variant: "emphasis" }],
          children: [reserve],
        },
      ],
    },
    {
      id: "order",
      type: "type",
      label: "Names the reservation it holds",
      sublabel: "Order",
      changed: true,
      sources: [source(TYPES, "Order")],
    },
    {
      id: "ttl",
      type: "config",
      label: "How long a hold lasts",
      sublabel: "RESERVATION_TTL_MS",
      sources: [source(RESERVE, "RESERVATION_TTL_MS")],
    },
    {
      id: "queue",
      type: "logic",
      label: "Handed to whichever job runs next",
      sublabel: "handlers[kind]",
      escape: true,
      description: "The handler is looked up by name at runtime, so the trace stops here.",
    },
  ]

  // Generic nodes for any type the table above has not met yet.
  const place = nodes[1]
  for (const type of CODE_NODE_TYPES) {
    if (NODE_OF_TYPE[type] !== undefined) continue
    const id = `generic-${type}`
    nodes.push({ id, type, label: `A \`${type}\` node`, sublabel: type })
    place?.edges?.push({ target: id })
  }
  // And a generic edge for any variant nobody carries.
  for (const variant of EDGE_VARIANTS) {
    if (EDGE_OF_VARIANT[variant] !== undefined) continue
    charge.edges?.push({ target: "ttl", label: variant, variant })
  }

  return { type: "code", title: "What happens when the customer places an order", nodes }
}

/* ------------------------------------------------------------------------- */
/* The blast radius                                                           */
/* ------------------------------------------------------------------------- */

type BlastNode = {
  id: string
  label: string
  path: string
  lines: [number, number]
  hop: number
  changed?: boolean
  changeType?: ChangeType
  effect?: string
  contract?: { before: string | null; now: string }
  sublabel?: string
  tag?: string
  description?: string
  unproven?: {
    path: string
    line: number
    reason: string
    candidates?: { path: string; name: string }[]
    runtime?: string
  }
}

type BlastEdge = { from: string; to: string; kind: BlastEdgeKind; at?: number; label?: string }

/** Which hand-written dependent carries each verdict. */
const NODE_OF_CHANGE: Record<string, string> = {
  breaks: "refunds",
  "behaviour-changes": "orders",
  unaffected: "daily",
}

/** Which hand-written edge carries each kind. */
const EDGE_OF_KIND: Record<string, string> = {
  call: "orders->index",
  "value-import": "refunds->seed-order",
  "re-export": "index->seed-place",
}

export function walkthroughBlast(): Record<string, unknown> & { type: "blast" } {
  const nodes: BlastNode[] = [
    {
      id: "seed-place",
      label: "placeOrder",
      path: PLACE,
      lines: pair(at(PLACE, "placeOrder")),
      hop: 0,
      changed: true,
      sublabel: "placeOrder.ts",
      contract: {
        before: "Charges the card, then returns the order.",
        now: `Holds the stock with ${linkTo(RESERVE, "reserveStock")} first, and releases it when the charge throws.`,
      },
    },
    {
      id: "seed-order",
      label: "Order",
      path: TYPES,
      lines: pair(at(TYPES, "Order")),
      hop: 0,
      changed: true,
      tag: "type",
      contract: {
        before: "`{ id, lines }`",
        now: `\`{ id, lines, reservation }\`, and ${linkToLine(TYPES, "export type Order", "`Order`")} requires the new field.`,
      },
    },
    {
      id: "seed-reserve",
      label: "reserveStock",
      path: RESERVE,
      lines: pair(at(RESERVE, "reserveStock")),
      hop: 0,
      changed: true,
      contract: { before: null, now: "Holds every line of a basket for ten minutes and returns the hold." },
    },
    {
      id: "index",
      label: "checkout index",
      path: INDEX,
      lines: pair(spanOf(INDEX, "export { placeOrder", "export { placeOrder")),
      hop: 1,
      changeType: "behaviour-changes",
      effect: "Re-exports the new order of steps unchanged, so every importer gets it.",
    },
    {
      id: "orders",
      label: "handleCreateOrder",
      path: ORDERS,
      lines: pair(at(ORDERS, "handleCreateOrder")),
      hop: 2,
      changeType: "behaviour-changes",
      effect: `Now answers 409 before any charge when stock runs out, through ${linkToLine(ORDERS, "if (cause instanceof", "the `OrderError` branch")}.`,
      description: "The one HTTP route that places orders.",
    },
    {
      id: "refunds",
      label: "refundOrder",
      path: REFUNDS,
      lines: pair(at(REFUNDS, "refundOrder")),
      hop: 1,
      changeType: "breaks",
      effect: `${linkTo(REFUNDS, "refundOrder")} builds an \`Order\` with no \`reservation\`, which no longer type-checks.`,
    },
    {
      id: "daily",
      label: "dailyTotal",
      path: DAILY,
      lines: pair(at(DAILY, "dailyTotal")),
      hop: 1,
      changeType: "unaffected",
      effect: "Reads only `lines`, so the new field never reaches it.",
    },
    {
      id: "email",
      label: "sendDailyEmail",
      path: EMAIL,
      lines: pair(at(EMAIL, "sendDailyEmail")),
      hop: 2,
    },
    {
      id: "queue",
      label: "handler(order)",
      path: QUEUE,
      lines: pair(spanOf(QUEUE, "if (handler !== undefined)", "if (handler !== undefined)")),
      hop: 1,
      unproven: {
        path: QUEUE,
        line: lineOf(QUEUE, "if (handler !== undefined)"),
        reason: "dynamic-dispatch",
        candidates: [{ path: "src/jobs/receipt.ts", name: "sendReceipt" }],
        runtime: "The handler is chosen by the job kind in the queue's configuration.",
      },
      changeType: "unaffected",
      effect: "Every handler takes the order whole and ignores fields it does not know.",
    },
  ]

  const edges: BlastEdge[] = [
    { from: "index", to: "seed-place", kind: "re-export", at: 1 },
    { from: "orders", to: "index", kind: "call", at: lineOf(ORDERS, "const order = await placeOrder") },
    { from: "refunds", to: "seed-order", kind: "value-import", at: 1 },
    { from: "daily", to: "seed-order", kind: "value-import", at: lineOf(DAILY, "import type { Order }") },
    { from: "email", to: "daily", kind: "call", at: lineOf(EMAIL, "dailyTotal(orders)") },
    { from: "queue", to: "seed-order", kind: "value-import", at: 1 },
  ]

  // Generic dependents for any verdict, and edges for any kind, not met yet.
  for (const changeType of CHANGE_TYPES) {
    if (NODE_OF_CHANGE[changeType] !== undefined) continue
    const id = `generic-${changeType}`
    nodes.push({
      id,
      label: `a ${changeType} dependent`,
      path: ORDERS,
      lines: [1, 1],
      hop: 1,
      changeType,
      effect: `Generated for \`${changeType}\`.`,
    })
    edges.push({ from: id, to: "seed-place", kind: "call" })
  }
  for (const kind of BLAST_EDGE_KINDS) {
    if (EDGE_OF_KIND[kind] !== undefined) continue
    edges.push({ from: "orders", to: "seed-order", kind })
  }

  return {
    type: "blast",
    title: "Who feels the reservation",
    seed: { diff: { base: BASE, head: HEAD } },
    nodes,
    edges,
    notes: ["`src/legacy/` was not walked: nothing parses its `.coffee` files."],
  }
}

/* ------------------------------------------------------------------------- */
/* The document                                                               */
/* ------------------------------------------------------------------------- */

export function walkthroughInput(): SampleInput {
  return {
    schema: 1,
    meta: {
      kind: "walkthrough",
      repo: REPO,
      at: { pr: 412 },
      head: HEAD,
      base: BASE,
      status: "complete",
    },
    title: "Reserve stock before charging the card",
    contextBody: {
      context:
        "A customer could be charged for an item that sold out while they paid. The order now holds the stock first and charges second, and gives the stock back when the charge fails.",
      overview: [
        {
          when: "the last item sells out while a customer is paying",
          then: `the customer is refused before any charge, by ${linkTo(STOCK, "hasStock")}`,
        },
        {
          when: "the card is declined",
          then: `the held stock goes back on sale at once — see [${HELD_TITLE}](#${HELD_SLUG})`,
        },
        {
          when: "a product has no stock row at all",
          then: "it counts as out of stock rather than passing the check",
        },
      ],
      implementation: [
        {
          label: PLACE,
          path: PLACE,
          items: [
            { text: `Reserved the stock with ${linkTo(RESERVE, "reserveStock")} before the charge.` },
            { text: `Released it with ${linkTo(RESERVE, "releaseStock")} when the charge throws.` },
          ],
        },
        {
          label: RESERVE,
          path: RESERVE,
          items: [{ text: "Added the reservation table's insert and delete." }],
        },
        {
          label: "Types and checks",
          items: [
            { text: `Required \`reservation\` on ${linkToLine(TYPES, "export type Order", "`Order`")}.` },
            { text: "Counted a missing stock row as zero." },
          ],
        },
      ],
    },
    diagram: walkthroughDiagram(),
    blast: walkthroughBlast(),
    codeWalkthrough: {
      note: "Follows the order from the stock check to the charge, then the files it leans on.",
      files: walkthroughFiles(),
    },
    findings: documentFindings(),
  }
}
