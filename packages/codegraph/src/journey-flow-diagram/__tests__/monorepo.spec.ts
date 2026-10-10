import { changing, journeyOf, pathsOf } from "./journey-repository"
import { MONOREPO, MONOREPO_ALIASES } from "./monorepo-repository"

const journeyOfChange = (changes: Readonly<Record<string, readonly string[]>>) => journeyOf(changing(MONOREPO, changes), MONOREPO_ALIASES)

describe("the journey of a change in a monorepo", () => {
  describe("a change in a shared package", () => {
    it("follows a default export the package gives a name", () => {
      const flow = journeyOfChange({ "packages/shared/src/slugify.ts": ["toLowerCase"] })

      expect(pathsOf(flow)).toStrictEqual(["[A user visits the page] → ProductPage", "ProductPage → slugify (changed)"])
    })

    it("gives no flow to a changed type or a changed barrel file of a package", () => {
      expect(journeyOfChange({ "packages/shared/src/types.ts": ["Cents"] })).toBeNull()
      expect(journeyOfChange({ "packages/shared/src/index.ts": ["./pricing"] })).toBeNull()
    })
  })

  describe("a change in the component package", () => {
    it("draws a changed component under the page of the app that renders it", () => {
      const flow = journeyOfChange({ "packages/ui/src/PriceTag.tsx": ["<span>"] })

      expect(pathsOf(flow)).toStrictEqual(["[A user visits the page] → ProductPage", "ProductPage → PriceTag (changed)"])
    })

    it("names the action and the visit of a changed component that holds the element the user acts on", () => {
      const flow = journeyOfChange({ "packages/ui/src/Button.tsx": ["<button"] })

      expect(pathsOf(flow)).toStrictEqual([
        "[A user clicks the button] → Button.onClick (changed)",
        "[A user visits the page] → ProductPage",
        "ProductPage → Button (changed)",
      ])
    })
  })
})
