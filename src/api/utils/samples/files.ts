import type { LineRange } from "../../../lib/schemas/document/primitives"

/**
 * The repository every sample cites, invented.
 *
 * `acme/storefront` does not exist, and that is the point: a sample that cited
 * this repository's own files broke every time one of them moved, and shipped
 * the cited sources with the extension so the panel could read them. These
 * live in memory and are read by nothing but the samples.
 *
 * Two versions of the tree. **Written** is what the documents were resolved
 * against, so every `expect` and every range is taken from it. **Served** is
 * what a reader's panel reads, and it differs in one file on purpose: the
 * anchor repair only does anything when the file moved under the document, and
 * a sample that never drifts can only ever show `matched`.
 */

export const REPO = "acme/storefront"

/** The commit the pull request is at. Every changed file is read here. */
export const HEAD = "3f8a2c1d9e7b6a5f4c3d2e1f0a9b8c7d6e5f4a3b"
/** The commit it forked from. */
export const BASE = "9c1e7a3b5d2f4e6a8c0b1d3f5e7a9c2b4d6f8e0a"
/** The mainline, where a file the change does not touch is read. */
export const MAIN = "7e5d3c1b9a8f6e4d2c0b1a3f5e7d9c2b4a6f8e1d"

const PLACE_ORDER = `import { chargeCard } from "../payments/chargeCard"
import { hasStock } from "./hasStock"
import { reserveStock, releaseStock } from "./reserve"
import { OrderError } from "./errors"
import type { Basket, Order } from "./types"

/**
 * Places an order for a basket.
 *
 * Stock is reserved before the card is charged, so a customer is never
 * charged for an item nobody can ship.
 */
export async function placeOrder(basket: Basket, card: string): Promise<Order> {
  const check = await hasStock(basket)
  if (!check.ok) {
    throw new OrderError("out-of-stock", check.short)
  }

  const reservation = await reserveStock(basket)
  try {
    const payment = await chargeCard(card, totalOf(basket))
    return { id: payment.id, lines: basket.lines, reservation: reservation.id }
  } catch (cause) {
    await releaseStock(reservation)
    throw cause
  }
}

/** What the basket costs, in cents. */
export function totalOf(basket: Pick<Basket, "lines">): number {
  let total = 0
  for (const line of basket.lines) {
    total += line.price * line.quantity
  }
  return total
}
`

const HAS_STOCK = `import { levelsFor } from "../inventory/levels"
import type { Basket } from "./types"

export type StockCheck = { ok: true } | { ok: false; short: string[] }

/** Whether every line in the basket can be shipped. */
export async function hasStock(basket: Basket): Promise<StockCheck> {
  const ids = basket.lines.map((line) => line.productId)
  const levels = await levelsFor(ids)
  const short = basket.lines
    .filter((line) => (levels.get(line.productId) ?? 0) < line.quantity)
    .map((line) => line.productId)
  return short.length === 0 ? { ok: true } : { ok: false, short }
}
`

const RESERVE = `import { db } from "../db"
import type { Basket } from "./types"

export type Reservation = { id: string; expiresAt: Date }

/** How long a reservation holds stock before it lapses. */
export const RESERVATION_TTL_MS = 10 * 60 * 1000

/** Holds stock for every line in the basket until the payment settles. */
export async function reserveStock(basket: Basket): Promise<Reservation> {
  const expiresAt = new Date(Date.now() + RESERVATION_TTL_MS)
  const id = await db.reservations.insert({ lines: basket.lines, expiresAt })
  return { id, expiresAt }
}

/** Gives the stock back when the payment fails. */
export async function releaseStock(reservation: Reservation): Promise<void> {
  await db.reservations.delete(reservation.id)
}
`

const TYPES = `export type BasketLine = { productId: string; quantity: number; price: number }
export type Basket = { lines: BasketLine[] }
export type Order = { id: string; lines: BasketLine[]; reservation: string }
`

const ERRORS = `export type OrderErrorCode = "out-of-stock" | "payment-declined"

/** A refusal the customer can act on, with the items it is about. */
export class OrderError extends Error {
  constructor(
    readonly code: OrderErrorCode,
    readonly items: string[] = [],
  ) {
    super(code)
  }
}
`

const LEGACY_CART = `import type { Basket } from "./types"

/** The basket shape the mobile app still sends. */
export type LegacyBasket = { items: { sku: string; qty: number; price: number }[] }

/** Converts the old basket into the current one. */
export function fromLegacy(legacy: LegacyBasket): Basket {
  return {
    lines: legacy.items.map((item) => ({
      productId: item.sku,
      quantity: item.qty,
      price: item.price,
    })),
  }
}

/** Whether a request body is the old basket shape. */
export function isLegacy(body: unknown): body is LegacyBasket {
  return typeof body === "object" && body !== null && "items" in body
}
`

/**
 * The same file after the mainline moved on.
 *
 * Three lines arrive at the top, so `fromLegacy` is still there and further
 * down: its range is **repaired**. `isLegacy` was renamed, so the line its
 * range was anchored on is gone: that range is **lost**. Both waypoints share
 * one panel, which is the case a shared panel must report for every card, not
 * only its first.
 */
const LEGACY_CART_SERVED = `// Kept until every mobile client sends the current basket.
// Delete with the last app version that still sends \`items\`.

${LEGACY_CART.replace("export function isLegacy(", "export function isLegacyBasket(")}`

const BASKET_VIEW = `import { placeOrder } from "./placeOrder"
import type { Basket } from "./types"

/** The basket page's submit button. */
export function BasketView({ basket, card }: { basket: Basket; card: string }) {
  const onSubmit = () => placeOrder(basket, card)
  return (
    <form onSubmit={onSubmit}>
      <button type="submit">Place order</button>
    </form>
  )
}
`

const CHARGE_CARD = `export type Payment = { id: string; amount: number }

/** Charges the card through the payment provider. */
export async function chargeCard(card: string, amount: number): Promise<Payment> {
  const response = await fetch("https://payments.example.com/charge", {
    method: "POST",
    body: JSON.stringify({ card, amount }),
  })
  if (!response.ok) throw new Error(\`charge failed: \${String(response.status)}\`)
  return (await response.json()) as Payment
}
`

const LEVELS = `import { db } from "../db"

/** Stock on hand, per product. */
export async function levelsFor(ids: string[]): Promise<Map<string, number>> {
  const rows = await db.stock.where("productId", "in", ids)
  return new Map(rows.map((row) => [row.productId, row.onHand]))
}
`

const FLAGS = `/** Whether checkout reserves stock before it charges the card. */
export const RESERVE_BEFORE_CHARGE = true

/** How often lapsed reservations are released. */
export const SWEEP_INTERVAL_MS = 60 * 1000
`

const ORDERS = `import { fromLegacy, isLegacy } from "../checkout/legacyCart"
import { placeOrder } from "../checkout"
import { OrderError } from "../checkout/errors"

/** \`POST /orders\` */
export async function handleCreateOrder(request: Request): Promise<Response> {
  const body: unknown = await request.json()
  const basket = isLegacy(body) ? fromLegacy(body) : (body as Parameters<typeof placeOrder>[0])
  try {
    const order = await placeOrder(basket, request.headers.get("x-card") ?? "")
    return Response.json(order, { status: 201 })
  } catch (cause) {
    if (cause instanceof OrderError) {
      return Response.json({ code: cause.code, items: cause.items }, { status: 409 })
    }
    throw cause
  }
}
`

const INDEX = `export { placeOrder, totalOf } from "./placeOrder"
export type { Order } from "./types"
`

const REFUNDS = `import type { Order } from "../checkout/types"

/** The order a refund is issued against, rebuilt from the ledger. */
export function refundOrder(id: string, lines: Order["lines"]): Order {
  return { id, lines }
}
`

const DAILY = `import { totalOf } from "../checkout/placeOrder"
import type { Order } from "../checkout/types"

/** The day's takings, for the finance report. */
export function dailyTotal(orders: Order[]): number {
  return orders.reduce((sum, order) => sum + totalOf({ lines: order.lines }), 0)
}
`

const EMAIL = `import { dailyTotal } from "./daily"
import type { Order } from "../checkout/types"

/** Sends the finance team the day's total. */
export async function sendDailyEmail(
  orders: Order[],
  send: (text: string) => Promise<void>,
): Promise<void> {
  await send(\`Today: \${String(dailyTotal(orders))}\`)
}
`

const QUEUE = `import type { Order } from "../checkout/types"

type Handler = (order: Order) => Promise<void>

/** Runs the follow-up job of one kind for a placed order. */
export async function runJob(
  handlers: Record<string, Handler>,
  kind: string,
  order: Order,
): Promise<void> {
  const handler = handlers[kind]
  if (handler !== undefined) await handler(order)
}
`

const NAMES = ["Kettle", "Teapot", "Mug", "Saucer", "Tray", "Strainer", "Caddy", "Cosy"]

/**
 * A file longer than the panel draws whole, for the windowed shape.
 *
 * Generated rather than written out: its length is the only thing about it
 * that matters, and 640 hand-written lines of catalogue would be noise.
 */
const PRODUCTS = [
  `export type Product = { id: string; name: string; price: number }`,
  ``,
  `/** Every product the store sells, in catalogue order. */`,
  `export const PRODUCTS: Product[] = [`,
  ...Array.from({ length: 640 }, (_, index) => {
    const name = `${NAMES[index % NAMES.length] ?? "Item"} ${String(Math.floor(index / NAMES.length) + 1)}`
    const price = 499 + ((index * 37) % 4000)
    return `  { id: "sku-${String(index + 1).padStart(4, "0")}", name: "${name}", price: ${String(price)} },`
  }),
  `]`,
  ``,
  `/** One product, or undefined for an id the catalogue does not have. */`,
  `export function productById(id: string): Product | undefined {`,
  `  return PRODUCTS.find((product) => product.id === id)`,
  `}`,
  ``,
].join("\n")

/** Every file at the commit the documents were written against. */
export const WRITTEN_FILES: Readonly<Record<string, string>> = {
  "src/checkout/placeOrder.ts": PLACE_ORDER,
  "src/checkout/hasStock.ts": HAS_STOCK,
  "src/checkout/reserve.ts": RESERVE,
  "src/checkout/types.ts": TYPES,
  "src/checkout/errors.ts": ERRORS,
  "src/checkout/legacyCart.ts": LEGACY_CART,
  "src/checkout/Basket.tsx": BASKET_VIEW,
  "src/checkout/index.ts": INDEX,
  "src/payments/chargeCard.ts": CHARGE_CARD,
  "src/inventory/levels.ts": LEVELS,
  "src/config/flags.ts": FLAGS,
  "src/api/orders.ts": ORDERS,
  "src/admin/refunds.ts": REFUNDS,
  "src/reports/daily.ts": DAILY,
  "src/reports/email.ts": EMAIL,
  "src/jobs/queue.ts": QUEUE,
  "src/catalog/products.ts": PRODUCTS,
}

/** Every file as a reader's panel reads it. See the top of this file. */
export const SERVED_FILES: Readonly<Record<string, string>> = {
  ...WRITTEN_FILES,
  "src/checkout/legacyCart.ts": LEGACY_CART_SERVED,
}

/** A file's lines, without the phantom line a trailing newline adds. */
export function linesOf(path: string, files = WRITTEN_FILES): string[] {
  const text = files[path]
  if (text === undefined) throw new Error(`the sample repository has no \`${path}\``)
  const lines = text.split("\n")
  if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop()
  return lines
}

/**
 * The one line containing `needle`, counting from 1.
 *
 * Every line number in the samples comes from here or from `findSymbol`, never
 * from a literal, so editing a file above cannot leave a range pointing at the
 * wrong code. Exactly one match or it throws: a needle that matched twice
 * would pick a line silently.
 */
export function lineOf(path: string, needle: string): number {
  const hits: number[] = []
  linesOf(path).forEach((line, index) => {
    if (line.includes(needle)) hits.push(index + 1)
  })
  if (hits.length !== 1) {
    throw new Error(`\`${needle}\` is on ${String(hits.length)} lines of \`${path}\`, not one`)
  }
  return hits[0] ?? 0
}

/** Lines from the one containing `first` to the one containing `last`. */
export function spanOf(path: string, first: string, last: string): LineRange {
  return { from: lineOf(path, first), to: lineOf(path, last) }
}

/** The whole file, as a range. */
export function wholeOf(path: string): LineRange {
  return { from: 1, to: linesOf(path).length }
}

/**
 * Where a declaration is, read off the text.
 *
 * Stands in for the grammar the server parses symbols with. The sample files
 * are written so this is enough: a declaration starts on the line naming it and
 * ends on the first line at column 0 that closes a brace or a bracket, or on
 * its own line when it opens none.
 */
export function findSymbol(path: string, name: string): LineRange | null {
  const text = WRITTEN_FILES[path]
  if (text === undefined) return null
  const lines = linesOf(path)
  const declares = new RegExp(`\\b(?:function|const|class|type|interface)\\s+${name}\\b`)
  const from = lines.findIndex((line) => declares.test(line))
  if (from < 0) return null
  const opening = lines[from] ?? ""
  if (!/[{([]\s*$/.test(opening)) return { from: from + 1, to: from + 1 }
  // `}` or `]`, and not `)`: a signature split over lines closes its
  // parameters at column 0 on the line that opens the body.
  const to = lines.findIndex((line, index) => index > from && /^[}\]]/.test(line))
  return { from: from + 1, to: to < 0 ? lines.length : to + 1 }
}

/** `path#L<from>-<to>` for a `code:` link to a declaration. */
export function linkTo(path: string, name: string, label = `\`${name}()\``): string {
  const range = findSymbol(path, name)
  if (range === null) throw new Error(`no \`${name}\` in \`${path}\``)
  return `[${label}](code:${path}#L${String(range.from)}-${String(range.to)})`
}

/** A `code:` link to the one line containing `needle`. */
export function linkToLine(path: string, needle: string, label: string): string {
  const line = lineOf(path, needle)
  return `[${label}](code:${path}#L${String(line)}-${String(line)})`
}
