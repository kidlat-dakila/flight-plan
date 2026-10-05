import type { Blast, JourneyFlow, ReviewArtifact, Segment } from "@flightplan/configurations"
import { HELD_STOCK_CHANGED_PATHS, HELD_STOCK_SOURCES, HELD_STOCK_UNCOVERED_PATH } from "./held-stock-sources"

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

const STOCK_JOURNEY: JourneyFlow = {
  id: "stock-check",
  title: "Checking stock and releasing expired holds",
  nodes: [
    {
      kind: "entry-point",
      id: "click-checkout",
      label: "Customer clicks Checkout",
      description: "The button on the cart page posts the cart to the checkout endpoint.",
    },
    {
      kind: "entry-point",
      id: "add-to-cart",
      label: "Customer adds an item to the cart",
      description: "The product page posts a SKU and a number of units.",
    },
    {
      kind: "entry-point",
      id: "product-page",
      label: "Product page loads",
      description: "The page asks for the stock level to decide whether to show the low stock badge.",
    },
    {
      kind: "declaration",
      id: "post-checkout",
      path: CHECKOUT_ROUTE_PATH,
      declaration: "postCheckout",
      isChanged: false,
      category: "logic",
      label: "Checkout endpoint",
      description: "Reads the cart and turns an `OutOfStockError` into a 409 response.",
    },
    {
      kind: "declaration",
      id: "checkout",
      path: CHECKOUT_PATH,
      declaration: "checkout",
      isChanged: false,
      category: "logic",
      label: "Check, charge, order",
      description: "Runs the stock guard for every line before it charges the customer.",
    },
    {
      kind: "declaration",
      id: "add-to-cart-route",
      path: CART_ROUTE_PATH,
      declaration: "addToCart",
      isChanged: false,
      category: "logic",
      label: "Add to cart endpoint",
      description: "Runs the stock guard before it appends the line to the cart.",
    },
    {
      kind: "declaration",
      id: "assert-in-stock",
      path: STOCK_LEVEL_PATH,
      declaration: "assertInStock",
      isChanged: true,
      category: "guard",
      label: "Refuse a line that cannot be filled",
      description: "Now takes the whole cart line, so it can pass the units this cart already holds.",
    },
    {
      kind: "declaration",
      id: "use-stock-level",
      path: USE_STOCK_LEVEL_PATH,
      declaration: "useStockLevel",
      isChanged: false,
      category: "logic",
      label: "Stock level query",
      description: "Hands `getStock` to the query hook, which runs it later.",
    },
    {
      kind: "declaration",
      id: "get-stock",
      path: STOCK_ROUTE_PATH,
      declaration: "getStock",
      isChanged: false,
      category: "logic",
      label: "Stock endpoint",
      description: "Returns the available units for one SKU.",
    },
    {
      kind: "declaration",
      id: "available-units",
      path: STOCK_LEVEL_PATH,
      declaration: "availableUnits",
      isChanged: true,
      category: "logic",
      label: "Units a shopper can still buy",
      description: "Subtracts the units other carts hold from the units on hand.",
    },
    {
      kind: "declaration",
      id: "active-holds",
      path: HOLDS_PATH,
      declaration: "activeHolds",
      isChanged: true,
      category: "data",
      label: "Holds that have not expired",
      description: "The query now leaves out holds whose expiry has passed.",
    },
    {
      kind: "declaration",
      id: "stock-badge",
      path: STOCK_BADGE_PATH,
      declaration: "StockBadge",
      isChanged: false,
      category: "ui",
      label: "Low stock badge",
      description: "Shows \"Only 3 left\" from the number the stock endpoint returns.",
    },
    {
      kind: "entry-point",
      id: "scheduler",
      label: "Scheduler fires every five minutes",
      description: "A cron expression in the job file starts the run.",
    },
    {
      kind: "declaration",
      id: "release-holds-job",
      path: RELEASE_JOB_PATH,
      declaration: "releaseHoldsJob",
      isChanged: true,
      category: "config",
      label: "Scheduled release job",
      description: "Registers the job and logs how many holds each run released.",
    },
    {
      kind: "declaration",
      id: "release-expired-holds",
      path: HOLDS_PATH,
      declaration: "releaseExpiredHolds",
      isChanged: true,
      category: "data",
      label: "Delete expired holds",
      description: "Deletes every hold whose expiry has passed and returns the count.",
    },
  ],
  edges: [
    { from: "click-checkout", to: "post-checkout", kind: "trigger", certainty: "proven" },
    { from: "add-to-cart", to: "add-to-cart-route", kind: "trigger", certainty: "proven" },
    { from: "product-page", to: "use-stock-level", kind: "trigger", certainty: "proven" },
    { from: "post-checkout", to: "checkout", kind: "call", certainty: "proven" },
    { from: "checkout", to: "assert-in-stock", kind: "call", certainty: "proven" },
    { from: "add-to-cart-route", to: "assert-in-stock", kind: "call", certainty: "proven" },
    { from: "assert-in-stock", to: "available-units", kind: "call", certainty: "proven" },
    { from: "use-stock-level", to: "get-stock", kind: "value", certainty: "assumed" },
    { from: "get-stock", to: "available-units", kind: "call", certainty: "proven" },
    { from: "available-units", to: "active-holds", kind: "call", certainty: "proven" },
    { from: "available-units", to: "stock-badge", kind: "data", certainty: "proven" },
    { from: "scheduler", to: "release-holds-job", kind: "trigger", certainty: "proven" },
    { from: "release-holds-job", to: "release-expired-holds", kind: "call", certainty: "proven" },
  ],
}

const STOCK_BLAST: Blast = {
  nodes: [
    {
      id: "available-units",
      ring: 0,
      path: STOCK_LEVEL_PATH,
      declaration: "availableUnits",
      label: "availableUnits",
      contract: {
        before: "Returns the units on hand for a SKU.",
        now: "Returns the units on hand minus the units other carts hold. Takes an optional `held`; callers that omit it see every hold subtracted. The result can be negative.",
      },
      verdict: null,
      effect: null,
    },
    {
      id: "assert-in-stock",
      ring: 0,
      path: STOCK_LEVEL_PATH,
      declaration: "assertInStock",
      label: "assertInStock",
      contract: {
        before: "Takes a SKU and a number of units. Throws `OutOfStockError` when the SKU has fewer units on hand.",
        now: "Takes one cart line. Throws `OutOfStockError` when the line asks for more than is available to this cart.",
      },
      verdict: null,
      effect: null,
    },
    {
      id: "active-holds",
      ring: 0,
      path: HOLDS_PATH,
      declaration: "activeHolds",
      label: "activeHolds",
      contract: {
        before: "Returns every hold on a SKU, expired or not.",
        now: "Returns only the holds on a SKU that have not expired.",
      },
      verdict: null,
      effect: null,
    },
    {
      id: "add-to-cart",
      ring: 1,
      path: CART_ROUTE_PATH,
      declaration: "addToCart",
      label: "addToCart",
      contract: null,
      verdict: "breaks",
      effect: "[`addToCart()`](code:src/api/routes/cart.ts#addToCart) still passes a SKU and a number. The guard now reads `line.sku` from a string, so the call does not type-check.",
    },
    {
      id: "checkout",
      ring: 1,
      path: CHECKOUT_PATH,
      declaration: "checkout",
      label: "checkout",
      contract: null,
      verdict: "behaviour-changes",
      effect: "[`checkout()`](code:src/checkout/checkout.ts#checkout) now refuses a cart when another cart holds the last units, where it used to charge.",
    },
    {
      id: "get-stock",
      ring: 1,
      path: STOCK_ROUTE_PATH,
      declaration: "getStock",
      label: "getStock",
      contract: null,
      verdict: "behaviour-changes",
      effect: "[`getStock()`](code:src/api/routes/stock.ts#getStock) omits `held`, so it reports the units left after every hold, and can report a negative number.",
    },
    {
      id: "low-stock-skus",
      ring: 1,
      path: RESTOCK_REPORT_PATH,
      declaration: "lowStockSkus",
      label: "lowStockSkus",
      contract: null,
      verdict: "unaffected",
      effect: "[`lowStockSkus()`](code:src/admin/restock-report.ts#lowStockSkus) clamps each level at zero before it compares, so a negative result changes nothing it returns.",
    },
    {
      id: "notify-back-in-stock",
      ring: 1,
      path: BACK_IN_STOCK_PATH,
      declaration: "notifyBackInStock",
      label: "notifyBackInStock",
      contract: null,
      verdict: null,
      effect: null,
    },
    {
      id: "post-checkout",
      ring: 2,
      path: CHECKOUT_ROUTE_PATH,
      declaration: "postCheckout",
      label: "postCheckout",
      contract: null,
      verdict: "behaviour-changes",
      effect: "[`postCheckout()`](code:src/api/routes/checkout.ts#postCheckout) answers 409 more often: held stock now counts as out of stock.",
    },
    {
      id: "stock-badge",
      ring: 2,
      path: STOCK_BADGE_PATH,
      declaration: "StockBadge",
      label: "StockBadge",
      contract: null,
      verdict: "behaviour-changes",
      effect: "[`StockBadge`](code:src/product/StockBadge.tsx#StockBadge) can render \"Only -2 left\" when holds exceed the units on hand.",
    },
    {
      id: "restock-table",
      ring: 2,
      path: RESTOCK_TABLE_PATH,
      declaration: "RestockTable",
      label: "RestockTable",
      contract: null,
      verdict: null,
      effect: null,
    },
  ],
  edges: [
    { from: "assert-in-stock", to: "available-units", kind: "call", certainty: "proven" },
    { from: "available-units", to: "active-holds", kind: "call", certainty: "proven" },
    { from: "add-to-cart", to: "assert-in-stock", kind: "call", certainty: "proven" },
    { from: "checkout", to: "assert-in-stock", kind: "call", certainty: "proven" },
    { from: "get-stock", to: "available-units", kind: "call", certainty: "proven" },
    { from: "low-stock-skus", to: "available-units", kind: "call", certainty: "proven" },
    { from: "notify-back-in-stock", to: "available-units", kind: "call", certainty: "proven" },
    { from: "post-checkout", to: "checkout", kind: "call", certainty: "proven" },
    { from: "stock-badge", to: "get-stock", kind: "data", certainty: "assumed" },
    { from: "restock-table", to: "low-stock-skus", kind: "call", certainty: "proven" },
  ],
}

const STOCK_SEGMENT: Segment = {
  id: "stock-check",
  title: "Stock check",
  changedPaths: [STOCK_LEVEL_PATH, HOLDS_PATH, HOLD_POLICY_PATH, RELEASE_JOB_PATH, HELD_STOCK_UNCOVERED_PATH],
  context: {
    context: "Two shoppers can both reach payment for the last unit of an item, and the second one is charged for something the warehouse cannot send. This part of the change makes the stock check count the units that other carts are holding, and lets a hold expire so that an abandoned cart does not block a sale for ever.",
    overview: [
      {
        when: "A shopper checks out an item while another cart holds the last unit",
        then: "The checkout is refused before any charge, with an out of stock answer.",
      },
      {
        when: "A shopper checks out an item their own cart already holds",
        then: "Their own hold does not count against them, and the checkout goes through.",
      },
      {
        when: "A cart is abandoned with units on hold",
        then: "The hold stops counting after 15 minutes, and a job deletes it within five more.",
      },
    ],
    implementation: [
      {
        label: "src/inventory",
        items: [
          "Subtracts held units in [`availableUnits()`](code:src/inventory/stock-level.ts#availableUnits), with an optional `held` for the caller's own units.",
          "Changes [`assertInStock()`](code:src/inventory/stock-level.ts#assertInStock) to take a cart line instead of a SKU and a number.",
          "Filters expired holds out of [`activeHolds()`](code:src/inventory/holds.ts#activeHolds).",
          "Adds [`placeHold()`](code:src/inventory/holds.ts#placeHold) and [`releaseExpiredHolds()`](code:src/inventory/holds.ts#releaseExpiredHolds).",
          "Adds the hold length as [`HOLD_MINUTES`](code:src/inventory/hold-policy.ts#HOLD_MINUTES).",
        ],
      },
      {
        label: "src/jobs",
        items: [
          "Adds [`releaseHoldsJob`](code:src/jobs/release-holds.ts#releaseHoldsJob), which runs every five minutes.",
        ],
      },
    ],
  },
  journey: STOCK_JOURNEY,
  journeyAbsence: null,
  blast: STOCK_BLAST,
  blastAbsence: null,
  walkthrough: {
    intro: "The tour follows a stock check from the guard down to the query, then the two functions that create and delete holds.",
    files: [
      {
        path: STOCK_LEVEL_PATH,
        title: "The stock check counts what other carts hold",
        summary: [
          "Subtracts held units in [`availableUnits()`](code:src/inventory/stock-level.ts#availableUnits), with an optional `held` for the caller's own units.",
          "Changes [`assertInStock()`](code:src/inventory/stock-level.ts#assertInStock) to take a cart line instead of a SKU and a number.",
        ],
        waypoints: [
          {
            id: "available-units",
            title: "Held units now reduce what a shopper can buy",
            declaration: "availableUnits",
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
        title: "Holds are placed, counted and released",
        summary: [
          "Filters expired holds out of [`activeHolds()`](code:src/inventory/holds.ts#activeHolds).",
          "Adds [`placeHold()`](code:src/inventory/holds.ts#placeHold) and [`releaseExpiredHolds()`](code:src/inventory/holds.ts#releaseExpiredHolds).",
        ],
        waypoints: [
          {
            id: "active-holds",
            title: "An expired hold stops counting at once",
            declaration: "activeHolds",
            reading: "The query now asks only for holds that expire after the current time. A hold therefore stops reducing the stock the moment it expires, even before the job deletes its row.",
            needsAttention: null,
            findings: [],
            children: [],
          },
          {
            id: "place-hold",
            title: "A new hold expires after the policy's minutes",
            declaration: "placeHold",
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
            reading: "Deletes the rows and returns how many it deleted, which is all the job logs. No history of a hold is kept.",
            needsAttention: null,
            findings: [],
            children: [],
          },
        ],
      },
      {
        path: HOLD_POLICY_PATH,
        title: "How long a hold lasts",
        summary: ["Adds the hold length as [`HOLD_MINUTES`](code:src/inventory/hold-policy.ts#HOLD_MINUTES)."],
        waypoints: [
          {
            id: "hold-minutes",
            title: "Fifteen minutes is the whole policy",
            declaration: "HOLD_MINUTES",
            reading: "One constant decides how long an abandoned cart blocks a sale. It is not configurable per item.",
            needsAttention: null,
            findings: [],
            children: [],
          },
        ],
      },
      {
        path: RELEASE_JOB_PATH,
        title: "A scheduled job cleans up expired holds",
        summary: ["Adds [`releaseHoldsJob`](code:src/jobs/release-holds.ts#releaseHoldsJob), which runs every five minutes."],
        waypoints: [
          {
            id: "release-holds-job",
            title: "The job only cleans up",
            declaration: "releaseHoldsJob",
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

const CHECKOUT_FLOW: JourneyFlow = {
  id: "checkout",
  title: "A checkout that places holds",
  nodes: [
    {
      kind: "entry-point",
      id: "click-checkout",
      label: "Customer clicks Checkout",
      description: "The button on the cart page posts the cart to the checkout endpoint.",
    },
    {
      kind: "declaration",
      id: "handle-checkout",
      path: CHECKOUT_BUTTON_PATH,
      declaration: "handleCheckout",
      isChanged: true,
      category: "ui",
      label: "Checkout button handler",
      description: "Now tells a held item apart from any other failure.",
    },
    {
      kind: "declaration",
      id: "post-checkout",
      path: CHECKOUT_ROUTE_PATH,
      declaration: "postCheckout",
      isChanged: false,
      category: "logic",
      label: "Checkout endpoint",
      description: "Reads the cart and turns an `OutOfStockError` into a 409 response.",
    },
    {
      kind: "declaration",
      id: "checkout",
      path: CHECKOUT_PATH,
      declaration: "checkout",
      isChanged: true,
      category: "logic",
      label: "Check, charge, hold, order",
      description: "Passes each line to the guard, and places a hold for each line after the charge.",
    },
  ],
  edges: [
    { from: "click-checkout", to: "handle-checkout", kind: "trigger", certainty: "proven" },
    { from: "handle-checkout", to: "post-checkout", kind: "call", certainty: "proven" },
    { from: "post-checkout", to: "checkout", kind: "call", certainty: "proven" },
  ],
}

const CHECKOUT_SEGMENT: Segment = {
  id: "checkout",
  title: "Checkout",
  changedPaths: [CHECKOUT_PATH, CART_LINE_PATH, CHECKOUT_BUTTON_PATH],
  context: {
    context: "The stock check can only count holds if checkout places them. This part of the change makes checkout hold each line's units, and tells the shopper when an item is held by someone else instead of showing a general error.",
    overview: [
      {
        when: "A shopper completes a checkout",
        then: "Each item in the order is held for them for 15 minutes.",
      },
      {
        when: "A shopper checks out an item that another cart holds",
        then: "The page says \"Someone else is holding the last of this item.\"",
      },
    ],
    implementation: [
      {
        label: "src/checkout",
        items: [
          "Passes the whole line to the guard and places holds in [`checkout()`](code:src/checkout/checkout.ts#checkout).",
          "Shows a message for a 409 answer in [`handleCheckout()`](code:src/checkout/CheckoutButton.tsx#handleCheckout).",
        ],
      },
      {
        label: "src/cart",
        items: ["Adds an optional `held` to [`CartLine`](code:src/cart/cart-line.ts#CartLine)."],
      },
    ],
  },
  journey: CHECKOUT_FLOW,
  journeyAbsence: null,
  blast: null,
  blastAbsence: "Nothing outside this segment calls the changed code: `checkout()` has one caller, and it is drawn above.",
  walkthrough: {
    intro: "The tour starts where the hold is placed, then the type that carries it and the message a shopper sees.",
    files: [
      {
        path: CHECKOUT_PATH,
        title: "Checkout places a hold after it charges",
        summary: [
          "Passes the whole line to the guard and places holds in [`checkout()`](code:src/checkout/checkout.ts#checkout).",
        ],
        waypoints: [
          {
            id: "checkout",
            title: "Checkout checks, charges, then holds",
            declaration: "checkout",
            reading: "The order of the steps is the review here. The guard runs first, the charge second and the hold third.",
            needsAttention: null,
            findings: [],
            children: [
              {
                id: "checkout-guard",
                title: "The guard receives the line",
                declaration: "checkout.guard",
                reading: "The call site follows the new signature of [`assertInStock()`](code:src/inventory/stock-level.ts#assertInStock). Nothing else changes on this line.",
                needsAttention: null,
                findings: [],
                children: [],
              },
              {
                id: "checkout-hold",
                title: "The hold is placed after the charge",
                declaration: "checkout.hold",
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
        title: "A cart line can carry its own hold",
        summary: ["Adds an optional `held` to [`CartLine`](code:src/cart/cart-line.ts#CartLine)."],
        waypoints: [
          {
            id: "cart-line",
            title: "A line can say how many units it already holds",
            declaration: "CartLine",
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
        title: "The button explains a held item",
        summary: [
          "Shows a message for a 409 answer in [`handleCheckout()`](code:src/checkout/CheckoutButton.tsx#handleCheckout).",
        ],
        waypoints: [
          {
            id: "handle-checkout",
            title: "A held item gets its own message",
            declaration: "handleCheckout",
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
  changedPaths: HELD_STOCK_CHANGED_PATHS,
}
