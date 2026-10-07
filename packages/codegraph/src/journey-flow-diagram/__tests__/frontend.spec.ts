import { FRONTEND_REPOSITORY } from "./frontend-repository"
import { adding, changing, entryPointsOf, journeyOf, pathsOf, frameOf } from "./journey-repository"

const VISIT_TO_HOME = ["[A user visits /] → HomePage"]

describe("the journey of a change in a frontend repository", () => {
  describe("a change in shared code", () => {
    it("climbs from a utility through every component that renders it, up to the app", () => {
      const flow = journeyOf(changing(FRONTEND_REPOSITORY, { "src/lib/formatPrice.ts": ["toFixed"] }))

      expect(pathsOf(flow)).toStrictEqual([
        "[A user visits /] → HomePage",
        "[A user visits /cart] → CartPage",
        "CartPage → CartSummary (if items.length > 0)",
        "CartSummary → formatPrice (changed)",
        "HomePage → ProductGrid",
        "ProductCard → formatPrice (changed)",
        "ProductGrid → ProductCard (for each of products)",
      ])
    })

    it("lists the lines a component steps through up to the render that leads to the change", () => {
      const flow = journeyOf(changing(FRONTEND_REPOSITORY, { "src/lib/formatPrice.ts": ["toFixed"] }))

      expect(frameOf(flow, "HomePage")).toStrictEqual([

        "6: const { data, isLoading } = useProducts()",

        "7: const addToCart = useCartStore((state) => state.add)",

        "9: if (isLoading) return <Spinner />",

        "11: return <ProductGrid products={data} onAdd={addToCart} />",

      ])
      expect(frameOf(flow, "CartSummary")).toStrictEqual([
        "5: const total = totalOf(items)",
        "7: return <strong>{formatPrice(total)}</strong>",
      ])
    })

    it("follows a component imported under another name through a barrel file", () => {
      const flow = journeyOf(changing(FRONTEND_REPOSITORY, { "src/components/LoadingSpinner.tsx": ["spinner"] }))

      expect(pathsOf(flow)).toStrictEqual([...VISIT_TO_HOME, "HomePage → LoadingSpinner (changed) (if isLoading)"])
    })
  })

  describe("a change in data fetching", () => {
    it("reaches a fetch function through the hook that hands it to a query", () => {
      const flow = journeyOf(changing(FRONTEND_REPOSITORY, { "src/api/products.ts": ["response.json"] }))

      expect(pathsOf(flow)).toStrictEqual([...VISIT_TO_HOME, "HomePage → useProducts", "useProducts → fetchProducts (changed)"])
    })

    it("names the click that runs a mutation function handed to a hook through a wrapper", () => {
      const flow = journeyOf(changing(FRONTEND_REPOSITORY, { "src/api/orders.ts": ["response.json"] }))

      expect(pathsOf(flow)).toStrictEqual([
        "[A user clicks the button] → Button",
        "Button → CartPage through CheckoutButton.onCheckout",
        "CartPage → placeOrder (changed)",
      ])
    })

    it("draws a changed hook with the component that calls it", () => {
      const flow = journeyOf(changing(FRONTEND_REPOSITORY, { "src/hooks/useProducts.ts": ["queryKey"] }))

      expect(pathsOf(flow)).toStrictEqual([...VISIT_TO_HOME, "HomePage → useProducts (changed)"])
    })
  })

  describe("a change in state", () => {
    it("follows a changed action of a store to the component that takes it and the click that runs it", () => {
      const flow = journeyOf(changing(FRONTEND_REPOSITORY, { "src/store/cart.ts": ["add: (product)"] }))

      expect(pathsOf(flow)).toStrictEqual([
        "[A user clicks Add to cart] → ProductCard",
        "HomePage → useCartStore (changed)",
        "ProductCard → HomePage through ProductGrid.onAdd",
      ])
    })

    it("draws every component that reads a store when the change is to the store as a whole", () => {
      const flow = journeyOf(changing(FRONTEND_REPOSITORY, { "src/store/cart.ts": ["items: [],"] }))

      expect(pathsOf(flow)).toStrictEqual([
        "[A user visits /] → HomePage",
        "[A user visits /cart] → CartPage",
        "CartPage → useCartStore (changed)",
        "HomePage → useCartStore (changed)",
      ])
    })

    it("takes the entry point of a selector from where the value the store hook returns is read", () => {
      const flow = journeyOf(changing(FRONTEND_REPOSITORY, { "src/store/cart.ts": ["selectItems"] }))

      expect(pathsOf(flow)).toStrictEqual([
        "[A user clicks the button] → Button",
        "[A user visits /cart] → CartPage",
        "Button → CartPage through CheckoutButton.onCheckout",
        "CartPage → selectItems (changed)",
      ])
    })

    it("ends at the context a changed function is handed to", () => {
      const flow = journeyOf(changing(FRONTEND_REPOSITORY, { "src/context/theme.tsx": ["classList"] }))

      expect(pathsOf(flow)).toStrictEqual(["[Reached through a context] → ThemeProvider", "ThemeProvider → toggleTheme (changed)"])
    })
  })

  describe("a change in a handler", () => {
    it("follows a changed handler through the props it is passed down to the element the user acts on", () => {
      const flow = journeyOf(changing(FRONTEND_REPOSITORY, { "src/pages/CartPage.tsx": ["trackCheckout"] }))

      expect(pathsOf(flow)).toStrictEqual([
        "[A user clicks the button] → Button",
        "Button → CartPage (changed) through CheckoutButton.onCheckout",
      ])
    })

    it("names the action when a handler goes to a component of a package", () => {
      const flow = journeyOf(changing(FRONTEND_REPOSITORY, { "src/pages/CartPage.tsx": ["clearDraft"] }))

      expect(pathsOf(flow)).toStrictEqual(["[A user triggers openchange on the Dialog] → CartPage (changed)"])
    })

    it("names the submit of a form and lists the lines stepped through into its handler", () => {
      const flow = journeyOf(changing(FRONTEND_REPOSITORY, { "src/lib/validateEmail.ts": ["EMAIL_PATTERN"] }))

      expect(pathsOf(flow)).toStrictEqual(["[A user submits the form] → SignUpPage", "SignUpPage → validateEmail (changed)"])
      expect(frameOf(flow, "SignUpPage")).toStrictEqual([
        "6: const [email, setEmail] = useState(\"\")",
        "8: const handleSubmit = async (event) => {",
        "9: event.preventDefault()",
        "10: if (!validateEmail(email)) {",
      ])
    })

    it("names both the action and the visit when a changed line holds a handler written in place", () => {
      const flow = journeyOf(changing(FRONTEND_REPOSITORY, { "src/pages/SignUpPage.tsx": ["normalizeEmail"] }))

      expect(pathsOf(flow)).toStrictEqual([
        "[A user changes the input] → SignUpPage (changed)",
        "[A user visits /sign-up] → SignUpPage (changed)",
      ])
    })

    it("names only the action when every changed line is inside a handler written in place", () => {
      const flow = journeyOf({
        "src/main.tsx": ["import { Counter } from \"./Counter\"", "", "createRoot(root).render(<Counter />)"],
        "src/Counter.tsx": [
          "export const Counter = () => {",
          "  const [count, setCount] = useState(0)",
          "",
          "  return (",
          "    <button",
          "      onClick={() => {",
          "        setCount(count + 2) // diff",
          "      }}",
          "    >",
          "      Add",
          "    </button>",
          "  )",
          "}",
        ],
      })

      expect(pathsOf(flow)).toStrictEqual(["[A user clicks Add] → Counter (changed)"])
      expect(entryPointsOf(flow)).toStrictEqual(["user-action: A user clicks Add"])
    })

    it("draws the component that holds a changed handler on a built-in element", () => {
      const flow = journeyOf(changing(FRONTEND_REPOSITORY, { "src/components/ProductCard.tsx": ["onAdd(product)"] }))

      expect(pathsOf(flow)).toStrictEqual([
        "[A user clicks Add to cart] → ProductCard (changed)",
        "[A user visits /] → HomePage",
        "HomePage → ProductGrid",
        "ProductGrid → ProductCard (changed) (for each of products)",
      ])
    })
  })

  describe("a change in what is rendered", () => {
    it("draws a new component together with the page that now renders it", () => {
      const withBanner = adding(
        {
          ...FRONTEND_REPOSITORY,
          "src/pages/HomePage.tsx": [
            "import { Banner } from \"../components/Banner\" // diff",
            "import { ProductGrid } from \"../components\"",
            "",
            "export const HomePage = () => (",
            "  <main>",
            "    <Banner /> // diff",
            "    <ProductGrid products={[]} onAdd={null} />",
            "  </main>",
            ")",
          ],
        },
        { "src/components/Banner.tsx": ["export const Banner = () => <aside>Free shipping this week</aside>"] },
      )

      expect(pathsOf(journeyOf(withBanner))).toStrictEqual([
        "[A user visits /] → HomePage (changed)",
        "HomePage (changed) → Banner (changed)",
      ])
    })

    it("draws a changed route table under the app that renders it", () => {
      const flow = journeyOf(changing(FRONTEND_REPOSITORY, { "src/routes.tsx": ["path=\"/cart\""] }))

      expect(pathsOf(flow)).toStrictEqual(["[A user visits the page] → App", "App → AppRoutes (changed)"])
    })

    it("lists every line of a changed return, with the changed line marked", () => {
      const flow = journeyOf(changing(FRONTEND_REPOSITORY, { "src/pages/CartPage.tsx": ["Your cart is empty"] }))

      expect(pathsOf(flow)).toStrictEqual(["[A user visits /cart] → CartPage (changed)"])
      expect(frameOf(flow, "CartPage")).toContain("22: {items.length > 0 ? <CartSummary items={items} /> : <p>Your cart is empty</p>} (changed)")
    })

    it("gives the statement that mounts the app a top level node", () => {
      const flow = journeyOf(changing(FRONTEND_REPOSITORY, { "src/main.tsx": ["createRoot(document"] }))

      expect(pathsOf(flow)).toStrictEqual(["[The app starts] → src/main.tsx, top level (changed)"])
    })
  })

  describe("a change that runs nothing", () => {
    it("gives no flow to a changed type", () => {
      expect(journeyOf(changing(FRONTEND_REPOSITORY, { "src/types.ts": ["price: number"] }))).toBeNull()
    })

    it("gives no flow to a changed barrel file", () => {
      expect(journeyOf(changing(FRONTEND_REPOSITORY, { "src/components/index.ts": ["./Button"] }))).toBeNull()
    })
  })

  describe("several changes at once", () => {
    it("joins a changed page, the hook it calls and the function the hook runs into one flow", () => {
      const flow = journeyOf(
        changing(FRONTEND_REPOSITORY, {
          "src/pages/HomePage.tsx": ["useProducts()"],
          "src/hooks/useProducts.ts": ["queryKey"],
          "src/api/products.ts": ["response.json"],
        }),
      )

      expect(pathsOf(flow)).toStrictEqual([
        "[A user visits /] → HomePage (changed)",
        "HomePage (changed) → useProducts (changed)",
        "useProducts (changed) → fetchProducts (changed)",
      ])
      expect(flow?.title).toBe("HomePage, useProducts, fetchProducts")
    })

    it("keeps changes on different pages in one flow with a path each", () => {
      const flow = journeyOf(
        changing(FRONTEND_REPOSITORY, { "src/lib/validateEmail.ts": ["EMAIL_PATTERN"], "src/lib/totalOf.ts": ["reduce"] }),
      )

      expect(pathsOf(flow)).toStrictEqual([
        "[A user submits the form] → SignUpPage",
        "[A user visits /cart] → CartPage",
        "CartPage → CartSummary (if items.length > 0)",
        "CartSummary → totalOf (changed)",
        "SignUpPage → validateEmail (changed)",
      ])
    })
  })
})
