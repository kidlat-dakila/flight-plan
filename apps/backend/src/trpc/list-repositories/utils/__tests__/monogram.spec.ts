import { monogramOf } from "@/trpc/list-repositories/utils/monogram"

describe("monogramOf", () => {
  it("takes the first letter of a single-word handle", () => {
    expect(monogramOf("mira")).toBe("M")
  })

  it("takes the first and the last initial of a full name", () => {
    expect(monogramOf("Amara de Okafor")).toBe("AO")
  })

  it("splits a handle on dots, dashes and underscores", () => {
    expect(monogramOf("jonas-weber")).toBe("JW")
    expect(monogramOf("teo.lind")).toBe("TL")
    expect(monogramOf("sam_ito")).toBe("SI")
  })

  it("marks a person with no name", () => {
    expect(monogramOf("  ")).toBe("?")
  })
})
