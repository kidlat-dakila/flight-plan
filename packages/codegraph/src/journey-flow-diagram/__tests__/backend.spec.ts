import { BACKEND_REPOSITORY } from "./backend-repository"
import { adding, changing, journeyOf, pathsOf, tracedLinesOf } from "./journey-repository"

describe("the journey of a change in a backend repository", () => {
  describe("a change behind an endpoint", () => {
    it("lists the lines a handler steps through, into its guard, up to its changed line", () => {
      const flow = journeyOf(changing(BACKEND_REPOSITORY, { "src/routes/orders.ts": ["status(404)"] }))

      expect(pathsOf(flow)).toStrictEqual(["[The app starts] → registerRoutes", "registerRoutes → getOrder (changed)"])
      expect(tracedLinesOf(flow, "getOrder")).toStrictEqual([
        "7: const order = await orderService.find(request.params.id)",
        "8: if (order === null) {",
        "9: return response.status(404).end() (changed)",
      ])
    })

    it("lists the branches and loops of a validation on the way to its changed line", () => {
      const flow = journeyOf(changing(BACKEND_REPOSITORY, { "src/services/validate-order.ts": ["A quantity must be positive"] }))

      expect(pathsOf(flow)).toContain("OrderService → validateOrder (changed)")
      expect(tracedLinesOf(flow, "validateOrder")).toStrictEqual([
        "4: if (input.lines.length === 0) {",
        "7: for (const line of input.lines) {",
        "8: if (line.quantity <= 0) {",
        "9: throw new ValidationError(\"A quantity must be positive\") (changed)",
      ])
    })

    it("names the API call of a handler exported under the name of its method", () => {
      const flow = journeyOf(changing(BACKEND_REPOSITORY, { "src/services/products.ts": ["db.products"] }))

      expect(pathsOf(flow)).toStrictEqual(["[GET] → GET", "GET → listProducts (changed)"])
    })
  })

  describe("a change that no request reaches", () => {
    it("says a new export nothing imports is not used yet", () => {
      const flow = journeyOf(adding(BACKEND_REPOSITORY, { "src/services/export-orders.ts": ["export const exportOrders = () => toCsv(db.orders.all())"] }))

      expect(pathsOf(flow)).toStrictEqual(["[Not used yet] → exportOrders (changed)"])
    })
  })

  describe("a change at the top level of a file", () => {
    it("gives changed statements of the server file one top level node with a line each", () => {
      const flow = journeyOf(changing(BACKEND_REPOSITORY, { "src/server.ts": ["app.use(requestLogger)", "app.listen"] }))

      expect(pathsOf(flow)).toStrictEqual(["[The app starts] → src/server.ts, top level (changed)"])
      expect(tracedLinesOf(flow, "top level")).toStrictEqual([
        "6: app.use(requestLogger) (changed)",
        "8: app.listen(3000) (changed)",
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
