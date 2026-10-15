import type { Blast, BlastNode, JourneyFlowDiagram, ReviewArtifact, Segment } from "@flightplan/configurations"
import { HELD_STOCK_CHANGED_PATHS, HELD_STOCK_SOURCES, HELD_STOCK_UNCOVERED_PATH } from "./held-stock-sources"
import { mockJourney } from "./mock-journey"

const STOCK_LEVEL_PATH = "src/inventory/stock-level.ts"
const HOLDS_PATH = "src/inventory/holds.ts"
const HOLD_POLICY_PATH = "src/inventory/hold-policy.ts"
const RELEASE_JOB_PATH = "src/jobs/release-holds.ts"
const CHECKOUT_PATH = "src/checkout/checkout.ts"
const CART_LINE_PATH = "src/cart/cart-line.ts"
const CHECKOUT_BUTTON_PATH = "src/checkout/CheckoutButton.tsx"
const CHECKOUT_ROUTE_PATH = "src/api/routes/checkout.ts"
const CART_ROUTE_PATH = "src/api/routes/cart.ts"
const STOCK_ROUTE_PATH = "src/api/routes/stock.ts"
const USE_STOCK_LEVEL_PATH = "src/product/use-stock-level.ts"
const STOCK_BADGE_PATH = "src/product/StockBadge.tsx"
const RESTOCK_REPORT_PATH = "src/admin/restock-report.ts"
const RESTOCK_TABLE_PATH = "src/admin/RestockTable.tsx"
const BACK_IN_STOCK_PATH = "src/notifications/back-in-stock.ts"

const STOCK_JOURNEY: JourneyFlowDiagram = mockJourney(
  HELD_STOCK_SOURCES,
  [
    { id: "post-checkout", type: "function", path: CHECKOUT_ROUTE_PATH, declaration: "postCheckout", isChanged: false, label: "Checkout endpoint", description: "Reads the cart and turns an `OutOfStockError` into a 409 response." },
    { id: "checkout", type: "function", path: CHECKOUT_PATH, declaration: "checkout", isChanged: false, label: "Check, charge, order", description: "Runs the stock guard for every line before it charges the customer." },
    { id: "add-to-cart-route", type: "function", path: CART_ROUTE_PATH, declaration: "addToCart", isChanged: false, label: "Add to cart endpoint", description: "Runs the stock guard before it appends the line to the cart." },
    { id: "assert-in-stock", type: "function", path: STOCK_LEVEL_PATH, declaration: "assertInStock", isChanged: true, label: "Refuse a line that cannot be filled", description: "Now takes the whole cart line, so it can pass the units this cart already holds." },
    { id: "use-stock-level", type: "hook", path: USE_STOCK_LEVEL_PATH, declaration: "useStockLevel", isChanged: false, label: "Stock level query", description: "Hands `getStock` to the query hook, which runs it later." },
    { id: "get-stock", type: "function", path: STOCK_ROUTE_PATH, declaration: "getStock", isChanged: false, label: "Stock endpoint", description: "Returns the available units for one SKU." },
    { id: "available-units", type: "function", path: STOCK_LEVEL_PATH, declaration: "availableUnits", isChanged: true, label: "Units a shopper can still buy", description: "Subtracts the units other carts hold from the units on hand." },
    { id: "active-holds", type: "function", path: HOLDS_PATH, declaration: "activeHolds", isChanged: true, label: "Holds that have not expired", description: "The query now leaves out holds whose expiry has passed." },
    { id: "stock-badge", type: "component", path: STOCK_BADGE_PATH, declaration: "StockBadge", isChanged: false, label: "Low stock badge", description: "Shows \"Only 3 left\" from the number the stock endpoint returns." },
    { id: "release-holds-job", type: "function", path: RELEASE_JOB_PATH, declaration: "releaseHoldsJob", isChanged: true, label: "Scheduled release job", description: "Registers the job and logs how many holds each run released." },
    { id: "release-expired-holds", type: "function", path: HOLDS_PATH, declaration: "releaseExpiredHolds", isChanged: true, label: "Delete expired holds", description: "Deletes every hold whose expiry has passed and returns the count." },
  ],
  [
    ["post-checkout", "checkout"],
    ["checkout", "assert-in-stock"],
    ["add-to-cart-route", "assert-in-stock"],
    ["assert-in-stock", "available-units"],
    ["use-stock-level", "get-stock"],
    ["get-stock", "available-units"],
    ["available-units", "active-holds"],
    ["available-units", "stock-badge"],
    ["release-holds-job", "release-expired-holds"],
  ],
  "Three paths reach the stock count. The checkout endpoint and the add to cart endpoint both run the stock guard, which asks for the units a shopper can still buy. The stock level query reaches the same count through the stock endpoint, and the low stock badge shows its answer. The count now reads the holds that have not expired and subtracts them. Apart from these, a scheduled job deletes the holds whose expiry has passed.",
)

const blastFile = (path: string, diffType: BlastNode["diffType"], impactType: BlastNode["impactType"] = null, impactReason: string | null = null): BlastNode => ({
  path,
  diffType,
  impactType,
  impactReason,
})

const STOCK_BLAST: Blast = {
  nodes: [
    blastFile(RESTOCK_REPORT_PATH, null, "unaffected"),
    blastFile(RESTOCK_TABLE_PATH, null),
    blastFile(CART_ROUTE_PATH, null),
    blastFile(CHECKOUT_ROUTE_PATH, null, "behaviour-changes", "[`postCheckout()`](code:src/api/routes/checkout.ts#postCheckout) answers 409 more often: held stock now counts as out of stock."),
    blastFile(STOCK_ROUTE_PATH, null, "behaviour-changes", "[`getStock()`](code:src/api/routes/stock.ts#getStock) omits `held`, so it reports the units left after every hold, and can report a negative number."),
    blastFile(CHECKOUT_PATH, null, "behaviour-changes", "[`checkout()`](code:src/checkout/checkout.ts#checkout) now refuses a cart when another cart holds the last units, where it used to charge."),
    blastFile(HOLD_POLICY_PATH, "added"),
    blastFile(HOLDS_PATH, "modified"),
    blastFile(STOCK_LEVEL_PATH, "modified"),
    blastFile(RELEASE_JOB_PATH, "added"),
    blastFile(BACK_IN_STOCK_PATH, null),
    blastFile(STOCK_BADGE_PATH, null, "breaks", "[`StockBadge`](code:src/product/StockBadge.tsx#StockBadge) renders \"Only -2 left\" when holds exceed the units on hand. It assumes the number is never negative."),
  ],
  edges: [
    { importer: STOCK_LEVEL_PATH, imported: HOLDS_PATH },
    { importer: HOLDS_PATH, imported: HOLD_POLICY_PATH },
    { importer: RELEASE_JOB_PATH, imported: HOLDS_PATH },
    { importer: CART_ROUTE_PATH, imported: STOCK_LEVEL_PATH },
    { importer: CHECKOUT_PATH, imported: STOCK_LEVEL_PATH },
    { importer: STOCK_ROUTE_PATH, imported: STOCK_LEVEL_PATH },
    { importer: RESTOCK_REPORT_PATH, imported: STOCK_LEVEL_PATH },
    { importer: BACK_IN_STOCK_PATH, imported: STOCK_LEVEL_PATH },
    { importer: CHECKOUT_ROUTE_PATH, imported: CHECKOUT_PATH },
    { importer: RESTOCK_TABLE_PATH, imported: RESTOCK_REPORT_PATH },
    { importer: STOCK_BADGE_PATH, imported: STOCK_ROUTE_PATH },
  ],
}

const STOCK_SEGMENT: Segment = {
  id: "stock-check",
  title: "Stock check",
  changedPaths: [STOCK_LEVEL_PATH, HOLDS_PATH, HOLD_POLICY_PATH, RELEASE_JOB_PATH, HELD_STOCK_UNCOVERED_PATH],
  context: [
    "Two shoppers can both reach payment for the last unit of an item, and the second one is charged for something the warehouse cannot send. This part of the change makes the stock check count the units that other carts are holding, and lets a hold expire so that an abandoned cart does not block a sale for ever.",
    "",
    "## Overview",
    "",
    "- **When** a shopper checks out an item while another cart holds the last unit, **then** the checkout is refused before any charge, with an out of stock answer.",
    "- **When** a shopper checks out an item their own cart already holds, **then** their own hold does not count against them, and the checkout goes through.",
    "- **When** a cart is abandoned with units on hold, **then** the hold stops counting after 15 minutes, and a job deletes it within five more.",
    "",
    "## Implementation",
    "",
    "**`src/inventory`**",
    "",
    "- Subtracts held units in [`availableUnits()`](code:src/inventory/stock-level.ts#availableUnits), with an optional `held` for the caller's own units.",
    "- Changes [`assertInStock()`](code:src/inventory/stock-level.ts#assertInStock) to take a cart line instead of a SKU and a number.",
    "- Filters expired holds out of [`activeHolds()`](code:src/inventory/holds.ts#activeHolds).",
    "- Adds [`placeHold()`](code:src/inventory/holds.ts#placeHold) and [`releaseExpiredHolds()`](code:src/inventory/holds.ts#releaseExpiredHolds).",
    "- Adds the hold length as [`HOLD_MINUTES`](code:src/inventory/hold-policy.ts#HOLD_MINUTES).",
    "",
    "**`src/jobs`**",
    "",
    "- Adds [`releaseHoldsJob`](code:src/jobs/release-holds.ts#releaseHoldsJob), which runs every five minutes.",
  ].join("\n"),
  journey: STOCK_JOURNEY,
  blast: STOCK_BLAST,
  walkthrough: {
    files: [
      {
        path: STOCK_LEVEL_PATH,
        waypoints: [
          {
            id: "available-units",
            title: "Held units now reduce what a shopper can buy",
            declaration: "availableUnits",
            codeBlocks: [],
            reading: "This is the number every stock decision reads. It used to be the units on hand. It now loads the stock and the active holds together and subtracts the holds, except the `held` units the caller says are its own.\n\nWithout the `held` parameter a shopper would be blocked by their own hold: the cart that holds the last unit could never buy it.",
            needsAttention: "Nothing stops the result from going below zero. Holds are placed after the charge in [`checkout()`](code:src/checkout/checkout.ts#checkout.hold), so two carts can each hold the last unit.",
            findings: [
              {
                id: "negative-available-units",
                kind: "risk",
                title: "Available units can be negative",
                reading: "When the holds on a SKU add up to more than the units on hand, the subtraction returns a negative number, and at least one caller shows that number to shoppers.",
                trace: [
                  "[`availableUnits()`](code:src/inventory/stock-level.ts#availableUnits) returns `stock.onHand - heldByOthers` with no lower bound.",
                  "[`getStock()`](code:src/api/routes/stock.ts#getStock) returns that number as `available`.",
                  "[`StockBadge`](code:src/product/StockBadge.tsx#StockBadge) renders it as \"Only -2 left\".",
                ],
                solution: [
                  "export const availableUnits = async (sku: string, held = 0): Promise<number> => {",
                  "  const [stock, holds] = await Promise.all([readStock(sku), activeHolds(sku)])",
                  "  const heldByOthers = holds.reduce((total, hold) => total + hold.units, 0) - held",
                  "  return Math.max(0, stock.onHand - heldByOthers)",
                  "}",
                ].join("\n"),
              },
            ],
            children: [],
          },
          {
            id: "assert-in-stock",
            title: "The guard takes the whole cart line",
            declaration: "assertInStock",
            codeBlocks: [],
            reading: "The guard needs the line's `held` units to pass them on, so its two parameters became one cart line. Every caller has to change with it.",
            needsAttention: null,
            findings: [
              {
                id: "add-to-cart-old-signature",
                kind: "bug",
                title: "The add to cart endpoint still calls the old signature",
                reading: "One caller was not updated. It passes a SKU and a number, so the guard reads `sku`, `units` and `held` from a string and every one of them is `undefined`. The comparison is then always false, and the guard never refuses.",
                trace: [
                  "[`addToCart()`](code:src/api/routes/cart.ts#addToCart) calls `assertInStock(sku, units)`.",
                  "[`assertInStock()`](code:src/inventory/stock-level.ts#assertInStock) reads `line.units`, which is `undefined` on a string.",
                  "`available < undefined` is `false`, so no `OutOfStockError` is thrown.",
                ],
                solution: null,
              },
              {
                id: "zero-unit-line",
                kind: "question",
                title: "Should a line with zero units pass the guard?",
                reading: "A line with `units: 0` passes whenever the available units are not negative. Is an empty line ever sent, and should it be refused earlier?",
                trace: null,
                solution: null,
              },
            ],
            children: [],
          },
        ],
      },
      {
        path: HOLDS_PATH,
        waypoints: [
          {
            id: "active-holds",
            title: "An expired hold stops counting at once",
            declaration: "activeHolds",
            codeBlocks: [],
            reading: "The query now asks only for holds that expire after the current time. A hold therefore stops reducing the stock the moment it expires, even before the job deletes its row.",
            needsAttention: null,
            findings: [],
            children: [],
          },
          {
            id: "place-hold",
            title: "A new hold expires after the policy's minutes",
            declaration: "placeHold",
            codeBlocks: [],
            reading: "Creates the hold that [`availableUnits()`](code:src/inventory/stock-level.ts#availableUnits) later subtracts. The expiry is the current time plus [`HOLD_MINUTES`](code:src/inventory/hold-policy.ts#HOLD_MINUTES).",
            needsAttention: null,
            findings: [
              {
                id: "hold-reads-clock",
                kind: "nit",
                title: "The expiry reads the clock inside the function",
                reading: "`Date.now()` makes the function hard to test without faking time. Passing the current time in would let a test state the expiry it expects.",
                trace: null,
                solution: [
                  "export const placeHold = async (cartId: string, sku: string, units: number, now: Date): Promise<Hold> =>",
                  "  database.holds.insert({",
                  "    cartId,",
                  "    sku,",
                  "    units,",
                  "    expiresAt: new Date(now.getTime() + HOLD_MINUTES * MS_PER_MINUTE),",
                  "  })",
                ].join("\n"),
              },
            ],
            children: [],
          },
          {
            id: "release-expired-holds",
            title: "Expired holds are deleted, not marked",
            declaration: "releaseExpiredHolds",
            codeBlocks: [],
            reading: "Deletes the rows and returns how many it deleted, which is all the job logs. No history of a hold is kept.",
            needsAttention: null,
            findings: [],
            children: [],
          },
        ],
      },
      {
        path: HOLD_POLICY_PATH,
        waypoints: [
          {
            id: "hold-minutes",
            title: "Fifteen minutes is the whole policy",
            declaration: "HOLD_MINUTES",
            codeBlocks: [],
            reading: "One constant decides how long an abandoned cart blocks a sale. It is not configurable per item.",
            needsAttention: null,
            findings: [],
            children: [],
          },
        ],
      },
      {
        path: RELEASE_JOB_PATH,
        waypoints: [
          {
            id: "release-holds-job",
            title: "The job only cleans up",
            declaration: "releaseHoldsJob",
            codeBlocks: [],
            reading: "The stock check is already correct without this job, because [`activeHolds()`](code:src/inventory/holds.ts#activeHolds) ignores expired holds. The job keeps the table from growing.",
            needsAttention: null,
            findings: [],
            children: [],
          },
        ],
      },
    ],
  },
}

const CHECKOUT_FLOW: JourneyFlowDiagram = mockJourney(
  HELD_STOCK_SOURCES,
  [
    { id: "handle-checkout", type: "function", path: CHECKOUT_BUTTON_PATH, declaration: "handleCheckout", isChanged: true, label: "Checkout button handler", description: "Now tells a held item apart from any other failure." },
    { id: "post-checkout", type: "function", path: CHECKOUT_ROUTE_PATH, declaration: "postCheckout", isChanged: false, label: "Checkout endpoint", description: "Reads the cart and turns an `OutOfStockError` into a 409 response." },
    { id: "checkout", type: "function", path: CHECKOUT_PATH, declaration: "checkout", isChanged: true, label: "Check, charge, hold, order", description: "Passes each line to the guard, and places a hold for each line after the charge." },
  ],
  [
    ["handle-checkout", "post-checkout"],
    ["post-checkout", "checkout"],
  ],
  "When a shopper presses the checkout button, its handler calls the checkout endpoint. The endpoint runs the checkout, which checks every line, charges the customer and now places a hold for each line. The handler changed as well: it tells an answer about a held item apart from any other failure.",
)

const CHECKOUT_SEGMENT: Segment = {
  id: "checkout",
  title: "Checkout",
  changedPaths: [CHECKOUT_PATH, CART_LINE_PATH, CHECKOUT_BUTTON_PATH],
  context: [
    "The stock check can only count holds if checkout places them. This part of the change makes checkout hold each line's units, and tells the shopper when an item is held by someone else instead of showing a general error.",
    "",
    "## Overview",
    "",
    "- **When** a shopper completes a checkout, **then** each item in the order is held for them for 15 minutes.",
    "- **When** a shopper checks out an item that another cart holds, **then** the page says \"Someone else is holding the last of this item.\"",
    "",
    "## Implementation",
    "",
    "**`src/checkout`**",
    "",
    "- Passes the whole line to the guard and places holds in [`checkout()`](code:src/checkout/checkout.ts#checkout).",
    "- Shows a message for a 409 answer in [`handleCheckout()`](code:src/checkout/CheckoutButton.tsx#handleCheckout).",
    "",
    "**`src/cart`**",
    "",
    "- Adds an optional `held` to [`CartLine`](code:src/cart/cart-line.ts#CartLine).",
  ].join("\n"),
  journey: CHECKOUT_FLOW,
  blast: null,
  walkthrough: {
    files: [
      {
        path: CHECKOUT_PATH,
        waypoints: [
          {
            id: "checkout",
            title: "Checkout checks, charges, then holds",
            declaration: "checkout",
            codeBlocks: [],
            reading: "The order of the steps is the review here. The guard runs first, the charge second and the hold third.",
            needsAttention: null,
            findings: [],
            children: [
              {
                id: "checkout-guard",
                title: "The guard receives the line",
                declaration: "checkout.guard",
                codeBlocks: [],
                reading: "The call site follows the new signature of [`assertInStock()`](code:src/inventory/stock-level.ts#assertInStock). Nothing else changes on this line.",
                needsAttention: null,
                findings: [],
                children: [],
              },
              {
                id: "checkout-hold",
                title: "The hold is placed after the charge",
                declaration: "checkout.hold",
                codeBlocks: [],
                reading: "A hold is what makes the next shopper's stock check fail. Here it is created only once the payment has gone through.",
                needsAttention: "Between the guard and the hold, the cart holds nothing. A second cart can pass the guard for the same last unit during the charge, and both are charged.",
                findings: [
                  {
                    id: "hold-after-charge",
                    kind: "risk",
                    title: "Two carts can both be charged for the last unit",
                    reading: "The window between the stock check and the hold is as long as the payment call. The change exists to close that window, and this order leaves it open.",
                    trace: [
                      "Cart A passes [the guard](code:src/checkout/checkout.ts#checkout.guard) for the last unit.",
                      "Cart B passes the same guard while cart A waits for `charge()`.",
                      "Both carts reach [`placeHold()`](code:src/inventory/holds.ts#placeHold), and both are charged.",
                    ],
                    solution: [
                      "  await Promise.all(cart.lines.map((line) => placeHold(cart.id, line.sku, line.units)))",
                      "  const payment = await charge(cart.customerId, total)",
                    ].join("\n"),
                  },
                ],
                children: [],
              },
            ],
          },
        ],
      },
      {
        path: CART_LINE_PATH,
        waypoints: [
          {
            id: "cart-line",
            title: "A line can say how many units it already holds",
            declaration: "CartLine",
            codeBlocks: [],
            reading: "The field is optional, so every place that builds a line keeps compiling. Nothing in this change sets it yet.",
            needsAttention: null,
            findings: [
              {
                id: "held-never-set",
                kind: "question",
                title: "Where is `held` set?",
                reading: "The stock check reads `line.held`, and no code in this pull request writes it. Is that a later change?",
                trace: null,
                solution: null,
              },
            ],
            children: [],
          },
        ],
      },
      {
        path: CHECKOUT_BUTTON_PATH,
        waypoints: [
          {
            id: "handle-checkout",
            title: "A held item gets its own message",
            declaration: "handleCheckout",
            codeBlocks: [],
            reading: "The endpoint already answers 409 for an `OutOfStockError`. The button used to show the general error for it, and now says what happened.",
            needsAttention: null,
            findings: [],
            children: [],
          },
        ],
      },
    ],
  },
}

export const HELD_STOCK_ARTIFACT: ReviewArtifact = {
  title: "Count held units in the stock check",
  status: "complete",
  commit: "9f2c1ab",
  isSegmented: true,
  segments: [STOCK_SEGMENT, CHECKOUT_SEGMENT],
  sources: HELD_STOCK_SOURCES,
  contextCodeBlocks: [],
  changedPaths: HELD_STOCK_CHANGED_PATHS,
}
