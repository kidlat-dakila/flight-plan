import { omit, recordOf } from "@/shared/record"

describe("recordOf", () => {
  it("gives the fields of an object", () => {
    expect(recordOf({ paths: 1 })).toStrictEqual({ paths: 1 })
  })

  it.each([["a list", [1]], ["nothing", null], ["a text", "paths"], ["a number", 1]])("gives nothing for %s", (_kind, value) => {
    expect(recordOf(value)).toBeNull()
  })
})

describe("omit", () => {
  it("gives the record without one field, and leaves the record as it was", () => {
    const config = { extends: "./base.json", paths: 1 }

    expect(omit(config, "extends")).toStrictEqual({ paths: 1 })
    expect(config).toStrictEqual({ extends: "./base.json", paths: 1 })
  })
})
