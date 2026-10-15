import { proseSchema } from "@/bands/band-schemas"

const paragraphOf = (text: string) => ({ kind: "paragraph", inlines: [{ kind: "text", text }] })

describe("proseSchema", () => {
  it("accepts a tabs block, each tab with a label and its own blocks", () => {
    const prose = [{ kind: "tabs", tabs: [{ label: "What's added", blocks: [paragraphOf("A page.")] }, { label: "What's modified", blocks: [] }] }]

    expect(proseSchema.parse(prose)).toStrictEqual(prose)
  })

  it("accepts an accordion block, each section with a label and its own blocks", () => {
    const prose = [{ kind: "accordion", sections: [{ label: "What's added", blocks: [paragraphOf("A page.")] }] }]

    expect(proseSchema.parse(prose)).toStrictEqual(prose)
  })

  it("refuses a tab without a label", () => {
    expect(proseSchema.safeParse([{ kind: "tabs", tabs: [{ blocks: [] }] }]).success).toBe(false)
  })
})
