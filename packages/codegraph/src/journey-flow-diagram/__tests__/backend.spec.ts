import { BACKEND_REPOSITORY } from "./backend-repository"
import { adding, changing, entryPointsOf, inPathOrder, journeyOf, pathsOf, frameOf } from "./journey-repository"

const ORDER_ENDPOINTS = [
  "[GET /orders/:id] → getOrder",
  "[POST /orders] → postOrder",
  "getOrder → orderService",
  "orderService → OrderService",
  "postOrder → orderService",
]

describe("the journey of a change in a backend repository", () => {
  describe("a change behind an endpoint", () => {
    it("names the API call of a changed route handler registered inside a function", () => {
      const flow = journeyOf(changing(BACKEND_REPOSITORY, { "src/routes/orders.ts": ["status(201)"] }))

      expect(pathsOf(flow)).toStrictEqual(["[POST /orders] → postOrder (changed)"])
      expect(entryPointsOf(flow)).toStrictEqual(["api-call: POST /orders"])
    })

    it("lists the lines a handler steps through, into its guard, up to its changed line", () => {
      const flow = journeyOf(changing(BACKEND_REPOSITORY, { "src/routes/orders.ts": ["status(404)"] }))

      expect(pathsOf(flow)).toStrictEqual(["[GET /orders/:id] → getOrder (changed)"])
      expect(frameOf(flow, "getOrder")).toStrictEqual([
        "7: const order = await orderService.find(request.params.id)",
        "8: if (order === null) {",
        "9: return response.status(404).end() (changed)",
      ])
    })

    it("climbs from a pricing function through the service class to the endpoints that use it", () => {
      const flow = journeyOf(changing(BACKEND_REPOSITORY, { "src/services/pricing.ts": ["line.quantity"] }))

      expect(pathsOf(flow)).toStrictEqual(inPathOrder([...ORDER_ENDPOINTS, "OrderService → totalOf (changed)"]))
    })

    it("draws two changes on one chain as one path", () => {
      const flow = journeyOf(
        changing(BACKEND_REPOSITORY, { "src/services/pricing.ts": ["amount * (1 + TAX_RATE)"], "src/routes/orders.ts": ["status(201)"] }),
      )

      expect(pathsOf(flow)).toStrictEqual([
        "[GET /orders/:id] → getOrder",
        "[POST /orders] → postOrder (changed)",
        "getOrder → orderService",
        "orderService → OrderService",
        "OrderService → totalOf",
        "postOrder (changed) → orderService",
        "totalOf → applyTax (changed)",
      ])
    })

    it("draws a changed method as its class", () => {
      const flow = journeyOf(changing(BACKEND_REPOSITORY, { "src/repositories/order-repository.ts": ["db.orders.insert"] }))

      expect(pathsOf(flow)).toStrictEqual([
        "[GET /orders/:id] → getOrder",
        "[POST /orders] → postOrder",
        "getOrder → orderService",
        "orderService → OrderRepository (changed)",
        "postOrder → orderService",
      ])
      expect(frameOf(flow, "OrderRepository")).toStrictEqual([
        "2: async insert(order) {",
        "3: return db.orders.insert(order) (changed)",
      ])
    })

    it("lists the branches and loops of a validation on the way to its changed line", () => {
      const flow = journeyOf(changing(BACKEND_REPOSITORY, { "src/services/validate-order.ts": ["A quantity must be positive"] }))

      expect(pathsOf(flow)).toStrictEqual(inPathOrder([...ORDER_ENDPOINTS, "OrderService → validateOrder (changed)"]))
      expect(frameOf(flow, "validateOrder")).toStrictEqual([
        "4: if (input.lines.length === 0) {",
        "7: for (const line of input.lines) {",
        "8: if (line.quantity <= 0) {",
        "9: throw new ValidationError(\"A quantity must be positive\") (changed)",
      ])
    })

    it("climbs from a changed constant to the endpoints through the code that reads it", () => {
      const flow = journeyOf(changing(BACKEND_REPOSITORY, { "src/config.ts": ["MAX_LINES"] }))

      expect(pathsOf(flow)).toStrictEqual(inPathOrder([...ORDER_ENDPOINTS, "OrderService → validateOrder", "validateOrder → MAX_LINES (changed)"]))
    })

    it("names the API call of a handler written in place at the top level of a file", () => {
      const flow = journeyOf(changing(BACKEND_REPOSITORY, { "src/services/health.ts": ["uptime"] }))

      expect(pathsOf(flow)).toStrictEqual(["[GET /] → healthOf (changed)"])
    })

    it("names the API call of a handler exported under the name of its method", () => {
      const flow = journeyOf(changing(BACKEND_REPOSITORY, { "src/services/products.ts": ["db.products"] }))

      expect(pathsOf(flow)).toStrictEqual(["[GET] → GET", "GET → listProducts (changed)"])
    })
  })

  describe("a change in middleware", () => {
    it("names the route a changed middleware is registered on", () => {
      const flow = journeyOf(changing(BACKEND_REPOSITORY, { "src/middleware/require-auth.ts": ["status(401)"] }))

      expect(pathsOf(flow)).toStrictEqual(["[POST /orders] → requireAuth (changed)"])
    })

    it("climbs from a helper to the route of the middleware that calls it", () => {
      const flow = journeyOf(changing(BACKEND_REPOSITORY, { "src/auth/verify-token.ts": ["jwt.verify"] }))

      expect(pathsOf(flow)).toStrictEqual(["[POST /orders] → requireAuth", "requireAuth → verifyToken (changed)"])
    })

    it("says a middleware registered on every route runs on any request", () => {
      const flow = journeyOf(changing(BACKEND_REPOSITORY, { "src/middleware/request-logger.ts": ["logger.info"] }))

      expect(pathsOf(flow)).toStrictEqual(["[Any request] → requestLogger (changed)"])
    })
  })

  describe("a change that no request reaches", () => {
    it("ends at the event bus a changed subscriber is registered on at the top level", () => {
      const flow = journeyOf(changing(BACKEND_REPOSITORY, { "src/mail/send-confirmation.ts": ["mailer.send"] }))

      expect(pathsOf(flow)).toStrictEqual(["[Reached through an event bus] → sendConfirmation (changed)"])
    })

    it("draws the function that registers a changed subscriber on an event bus", () => {
      const flow = journeyOf(changing(BACKEND_REPOSITORY, { "src/payments/refund-order.ts": ["payments.refund"] }))

      expect(pathsOf(flow)).toStrictEqual(["[Reached through an event bus] → registerSubscribers", "registerSubscribers → refundOrder (changed)"])
    })

    it("names the schedule a changed job runs on", () => {
      const flow = journeyOf(changing(BACKEND_REPOSITORY, { "src/jobs/expire-orders.ts": ["expireOlderThan"] }))

      expect(pathsOf(flow)).toStrictEqual(["[expireOrders runs on a schedule] → expireOrders (changed)"])
      expect(entryPointsOf(flow)).toStrictEqual(["command: expireOrders runs on a schedule"])
    })

    it("names the command a changed function runs from", () => {
      const flow = journeyOf(changing(BACKEND_REPOSITORY, { "src/db/migrate.ts": ["readMigrations"] }))

      expect(pathsOf(flow)).toStrictEqual(["[main] → main", "main → migrate (changed)"])
      expect(entryPointsOf(flow)).toStrictEqual(["command: main"])
    })

    it("says a new export nothing imports is not used yet", () => {
      const flow = journeyOf(adding(BACKEND_REPOSITORY, { "src/services/export-orders.ts": ["export const exportOrders = () => toCsv(db.orders.all())"] }))

      expect(pathsOf(flow)).toStrictEqual(["[Not used yet] → exportOrders (changed)"])
    })
  })

  describe("a change at the top level of a file", () => {
    it("gives changed statements of the server file one top level node with a line each", () => {
      const flow = journeyOf(changing(BACKEND_REPOSITORY, { "src/server.ts": ["app.use(requestLogger)", "app.listen"] }))

      expect(pathsOf(flow)).toStrictEqual(["[The app starts] → src/server.ts, top level (changed)"])
      expect(frameOf(flow, "top level")).toStrictEqual([
        "6: app.use(requestLogger) (changed)",
        "8: app.listen(3000) (changed)",
      ])
    })

    it("draws a new endpoint as its handler behind the API call and the function that registers it", () => {
      const withCancel = adding(
        {
          ...BACKEND_REPOSITORY,
          "src/routes/index.ts": [
            "import { cancelOrder } from \"./cancel-order\" // diff",
            "import { getOrder } from \"./orders\"",
            "",
            "export const registerRoutes = (app) => {",
            "  app.get(\"/orders/:id\", getOrder)",
            "  app.delete(\"/orders/:id\", cancelOrder) // diff",
            "}",
          ],
        },
        { "src/routes/cancel-order.ts": ["export const cancelOrder = async (request, response) => {", "  return response.status(204).end()", "}"] },
      )

      expect(pathsOf(journeyOf(withCancel))).toStrictEqual([
        "[DELETE /orders/:id] → cancelOrder (changed)",
        "[The app starts] → registerRoutes (changed)",
      ])
    })

    it("gives a changed route registration at the top level a node and its handler the API call", () => {
      const flow = journeyOf(changing(BACKEND_REPOSITORY, { "src/routes/health.ts": ["healthRouter.get"] }))

      expect(pathsOf(flow)).toStrictEqual(["[The app starts] → src/routes/health.ts, top level (changed)"])
    })
  })

  describe("a change that runs nothing", () => {
    it("gives no flow to a changed interface", () => {
      expect(journeyOf(changing(BACKEND_REPOSITORY, { "src/types.ts": ["total: number"] }))).toBeNull()
    })

    it("gives no flow to a changed import", () => {
      expect(journeyOf(changing(BACKEND_REPOSITORY, { "src/cli.ts": ["import { migrate }"] }))).toBeNull()
    })
  })
})
