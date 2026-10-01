import { greet } from "@/procedures/greet"

describe("greet", () => {
  it("greets the given name", () => {
    expect(greet({ name: "Mira" })).toStrictEqual({ message: "Hello Mira" })
  })
})
