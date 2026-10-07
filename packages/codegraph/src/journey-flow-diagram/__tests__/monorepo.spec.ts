import { changing, edgeOf, entryPointsOf, journeyOf, pathsOf, frameOf } from "./journey-repository"
import { MONOREPO, MONOREPO_ALIASES } from "./monorepo-repository"

const journeyOfChange = (changes: Readonly<Record<string, readonly string[]>>) => journeyOf(changing(MONOREPO, changes), MONOREPO_ALIASES)

describe("the journey of a change in a monorepo", () => {
  describe("a change in a shared package", () => {
    it("climbs from a shared function into every app that uses it, each with its own entry point", () => {
      const flow = journeyOfChange({ "packages/shared/src/pricing.ts": ["roundToCents(cents"] })

      expect(pathsOf(flow)).toStrictEqual([
        "[A user visits the page] → ProductPage",
        "[POST /checkout] → postCheckout",
        "postCheckout → priceWithTax (changed)",
        "PriceTag → priceWithTax (changed)",
        "ProductPage → PriceTag",
      ])
      expect(entryPointsOf(flow)).toStrictEqual(["page-visit: A user visits the page", "api-call: POST /checkout"])
    })

    it("climbs from a function the package does not export through the one that calls it", () => {
      const flow = journeyOfChange({ "packages/shared/src/rounding.ts": ["Math.round"] })

      expect(pathsOf(flow)).toStrictEqual([
        "[A user visits the page] → ProductPage",
        "[POST /checkout] → postCheckout",
        "postCheckout → roundToCents (changed) through priceWithTax",
        "PriceTag → roundToCents (changed) through priceWithTax",
        "ProductPage → PriceTag",
      ])
    })

    it("follows a function an app imports under the name the package exports it by", () => {
      const flow = journeyOfChange({ "packages/shared/src/validation.ts": ["EMAIL_PATTERN"] })

      expect(pathsOf(flow)).toStrictEqual(["[POST /sign-up] → postSignUp", "postSignUp → isValidEmail (changed)"])
      expect(frameOf(flow, "postSignUp")).toStrictEqual([
        "4: if (!validateEmail(request.body.email)) {",
      ])
    })

    it("follows a default export the package gives a name", () => {
      const flow = journeyOfChange({ "packages/shared/src/slugify.ts": ["toLowerCase"] })

      expect(pathsOf(flow)).toStrictEqual(["[A user visits the page] → ProductPage", "ProductPage → slugify (changed)"])
    })

    it("climbs from a shared constant to the code of both apps that reads it", () => {
      const flow = journeyOfChange({ "packages/shared/src/limits.ts": ["MAX_CART_ITEMS"] })

      expect(pathsOf(flow)).toStrictEqual([
        "[A user clicks the button] → Button",
        "[POST /checkout] → postCheckout",
        "addToCart → MAX_CART_ITEMS (changed)",
        "Button → addToCart through ProductPage",
        "postCheckout → MAX_CART_ITEMS (changed)",
      ])
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
        "[A user clicks the button] → Button (changed)",
        "[A user visits the page] → ProductPage",
        "ProductPage → Button (changed)",
      ])
    })
  })

  describe("a change in an app", () => {
    it("follows a function of the app through a prop into the component package and names the click", () => {
      const flow = journeyOfChange({ "apps/web/src/cart/addToCart.ts": ["cart.items.push"] })

      expect(pathsOf(flow)).toStrictEqual(["[A user clicks the button] → Button", "Button → addToCart (changed) through ProductPage"])
      expect(edgeOf(flow, "Button", "addToCart")?.kind).toBe("value")
    })

    it("stays inside the app when nothing else uses the change", () => {
      const flow = journeyOfChange({ "apps/api/src/routes/sign-up.ts": ["createAccount"] })

      expect(pathsOf(flow)).toStrictEqual(["[POST /sign-up] → postSignUp (changed)"])
    })

    it("draws changes in two apps and a package they share as one flow", () => {
      const flow = journeyOfChange({
        "packages/shared/src/pricing.ts": ["roundToCents(cents"],
        "apps/api/src/routes/checkout.ts": ["charge(total)"],
        "apps/web/src/pages/ProductPage.tsx": ["<PriceTag"],
      })

      expect(pathsOf(flow)).toStrictEqual([
        "[A user visits the page] → ProductPage (changed)",
        "[POST /checkout] → postCheckout (changed)",
        "postCheckout (changed) → priceWithTax (changed)",
        "PriceTag → priceWithTax (changed)",
        "ProductPage (changed) → PriceTag",
      ])
    })
  })
})
