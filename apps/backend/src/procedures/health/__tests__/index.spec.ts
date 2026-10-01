import { health } from "@/procedures/health"

describe("health", () => {
  it("reports that the server is up", () => {
    expect(health()).toStrictEqual({ status: "ok" })
  })
})
