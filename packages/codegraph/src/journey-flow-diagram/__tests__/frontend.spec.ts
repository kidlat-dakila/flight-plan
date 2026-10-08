import { FRONTEND_REPOSITORY } from "./frontend-repository"
import { adding, categoriesOf, changing, dataOf, entryPointsOf, eventsOf, handlerNodesOf, journeyOf, pathsOf, tracedLinesOf } from "./journey-repository"

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

      expect(tracedLinesOf(flow, "HomePage")).toStrictEqual([

        "6: const { data, isLoading } = useProducts()",

        "7: const addToCart = useCartStore((state) => state.add)",

        "9: if (isLoading) return <Spinner />",

        "11: return <ProductGrid products={data} onAdd={addToCart} />",

      ])
      expect(tracedLinesOf(flow, "CartSummary")).toStrictEqual([
        "5: const total = totalOf(items)",
        "7: return <strong>{formatPrice(total)}</strong>",
      ])
    })

    it("gives the category ui to a component and logic to any other node", () => {
      const flow = journeyOf(changing(FRONTEND_REPOSITORY, { "src/lib/formatPrice.ts": ["toFixed"] }))

      expect(categoriesOf(flow)).toStrictEqual([
        "CartPage: ui",
        "CartSummary: ui",
        "formatPrice: logic",
        "HomePage: ui",
        "ProductCard: ui",
        "ProductGrid: ui",
      ])
    })

    it("gives the category event to a handler node, and logic to the top level of a file and to a route table that holds markup", () => {
      const handled = journeyOf(changing(FRONTEND_REPOSITORY, { "src/pages/CartPage.tsx": ["clearDraft"] }))
      const mounted = journeyOf(changing(FRONTEND_REPOSITORY, { "src/main.tsx": ["createRoot(document"] }))
      const routed = journeyOf({ "src/router.tsx": ["export const router = createBrowserRouter([", "  { path: \"/\", element: <main /> }, // diff", "])"] })

      expect(categoriesOf(handled)).toStrictEqual(["CartPage.handleClose: event"])
      expect(categoriesOf(mounted)).toStrictEqual(["top level: logic"])
      expect(categoriesOf(routed)).toStrictEqual(["router: logic"])
    })

    it("lists on a component the callbacks its markup hands over, with the lines of each", () => {
      const flow = journeyOf(changing(FRONTEND_REPOSITORY, { "src/lib/formatPrice.ts": ["toFixed"] }))

      expect(eventsOf(flow, "HomePage")).toStrictEqual(["ProductGrid.onAdd @11"])
      expect(eventsOf(flow, "ProductGrid")).toStrictEqual(["ProductCard.onAdd @6"])
      expect(eventsOf(flow, "ProductCard")).toStrictEqual(["button.onClick @6"])
      expect(eventsOf(flow, "CartPage")).toStrictEqual(["Dialog.onOpenChange @21", "CheckoutButton.onCheckout @23"])
      expect(eventsOf(flow, "formatPrice")).toStrictEqual([])
    })

    it("lists on a component the variables its markup reads that are defined outside it, without the functions it calls and the callbacks", () => {
      const flow = journeyOf(changing(FRONTEND_REPOSITORY, { "src/lib/formatPrice.ts": ["toFixed"] }))

      expect(dataOf(flow, "HomePage")).toStrictEqual(["data @11"])
      expect(dataOf(flow, "ProductGrid")).toStrictEqual(["products @5"])
      expect(dataOf(flow, "ProductCard")).toStrictEqual(["product @5"])
      expect(dataOf(flow, "CartPage")).toStrictEqual(["items @22"])
      expect(dataOf(flow, "formatPrice")).toStrictEqual([])
    })

    it("links an event of a component to the handler node it leads to, and to none when no handler node is drawn", () => {
      const flow = journeyOf(changing(FRONTEND_REPOSITORY, { "src/pages/CartPage.tsx": ["clearDraft", "Your cart is empty"] }))

      expect(handlerNodesOf(flow, "CartPage")).toStrictEqual(["Dialog.onOpenChange @21 → CartPage.handleClose", "CheckoutButton.onCheckout @23 → none"])
    })

    it("says of each event and each variable whether the diff touched it, is linked to it, or neither", () => {
      const flow = journeyOf({
        "src/CartLine.tsx": [
          "export const CartLine = ({ item, onRemove }) => {",
          "  const total = item.price * item.quantity // diff",
          "  const label = item.name",
          "  const handleRemove = () => {",
          "    trackRemoval(item.id) // diff",
          "    onRemove(item.id)",
          "  }",
          "  const handleEdit = () => {",
          "    openEditor(item.id)",
          "  }",
          "  useEffect(() => {",
          "    window.addEventListener(\"keydown\", handleRemove)",
          "  }, [])",
          "  return (",
          "    <li>",
          "      <span>{label}</span>",
          "      <strong>{formatPrice(total)}</strong>",
          "      <em>{item.discount}</em> // diff",
          "      <button onClick={handleRemove}>Remove</button>",
          "      <button onClick={handleEdit}>Edit</button>",
          "      <button onDoubleClick={() => onRemove(item.id)}>Clear</button> // diff",
          "    </li>",
          "  )",
          "}",
        ],
      })

      expect(eventsOf(flow, "CartLine")).toStrictEqual([
        "window.keydown @12 (related)",
        "button.onClick @19 (related)",
        "button.onClick @20",
        "button.onDoubleClick @21 (diff)",
      ])
      expect(dataOf(flow, "CartLine")).toStrictEqual(["label @16", "total @17 (related)", "item @18 (diff)"])
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
        "[A user clicks the button] → CartPage.handleCheckout through Button.onClick, CheckoutButton.onCheckout",
        "CartPage.handleCheckout → placeOrder (changed)",
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
        "[A user clicks Add to cart] → HomePage.onAdd through ProductCard.onClick, ProductGrid.onAdd",
        "HomePage.onAdd → useCartStore (changed)",
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
        "[A user clicks the button] → CartPage.handleCheckout through Button.onClick, CheckoutButton.onCheckout",
        "[A user visits /cart] → CartPage",
        "CartPage → selectItems (changed)",
        "CartPage.handleCheckout → selectItems (changed)",
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
        "[A user clicks the button] → CartPage.handleCheckout (changed) through Button.onClick, CheckoutButton.onCheckout",
      ])
    })

    it("names the action when a handler goes to a component of a package", () => {
      const flow = journeyOf({
        "src/DraftDialog.tsx": [
          "import { Dialog } from \"@radix-ui/react-dialog\"",
          "import { clearDraft } from \"./clearDraft\"",
          "",
          "export const DraftDialog = () => {",
          "  const handleClose = () => {",
          "    clearDraft()",
          "  }",
          "",
          "  return <Dialog onOpenChange={handleClose} />",
          "}",
        ],
        "src/clearDraft.ts": ["export const clearDraft = () => {", "  return storage.remove(\"draft\") // diff", "}"],
      })

      expect(pathsOf(flow)).toStrictEqual([
        "[A user triggers openchange on the Dialog] → DraftDialog.handleClose",
        "DraftDialog.handleClose → clearDraft (changed)",
      ])
    })

    it("names the submit of a form and lists the lines stepped through into its handler", () => {
      const flow = journeyOf(changing(FRONTEND_REPOSITORY, { "src/lib/validateEmail.ts": ["EMAIL_PATTERN"] }))

      expect(pathsOf(flow)).toStrictEqual(["[A user submits the form] → SignUpPage.handleSubmit", "SignUpPage.handleSubmit → validateEmail (changed)"])
      expect(tracedLinesOf(flow, "SignUpPage.handleSubmit")).toStrictEqual([
        "8: const handleSubmit = async (event) => {",
        "9: event.preventDefault()",
        "10: if (!validateEmail(email)) {",
        "11: return",
        "12: }",
        "13: await signUp({ email })",
        "14: }",
        "17: <form onSubmit={handleSubmit}>",
        "18: <input value={email} onChange={(event) => setEmail(normalizeEmail(event.target.value))} />",
        "19: <button type=\"submit\">Sign up</button>",
        "20: </form>",
      ])
    })

    it("names the action of a changed line that holds a handler written in place", () => {
      const flow = journeyOf({
        "src/EmailField.tsx": [
          "import { normalizeEmail } from \"./normalizeEmail\"",
          "",
          "export const EmailField = ({ email, setEmail }) => (",
          "  <input value={email} onChange={(event) => setEmail(normalizeEmail(event.target.value))} /> // diff",
          ")",
        ],
        "src/normalizeEmail.ts": ["export const normalizeEmail = (email) => {", "  return email.trim() // diff", "}"],
      })

      expect(pathsOf(flow)).toStrictEqual([
        "[A user changes the input] → EmailField.onChange (changed)",
        "[A user visits the page] → EmailField (changed)",
        "EmailField.onChange (changed) → normalizeEmail (changed)",
      ])
    })

    it("names only the action when every changed line is inside a handler written in place", () => {
      const flow = journeyOf({
        "src/main.tsx": ["import { Counter } from \"./Counter\"", "", "createRoot(root).render(<Counter />)"],
        "src/Counter.tsx": [
          "import { nextCount } from \"./nextCount\"",
          "",
          "export const Counter = () => {",
          "  const [count, setCount] = useState(0)",
          "",
          "  return (",
          "    <button",
          "      onClick={() => {",
          "        setCount(nextCount(count)) // diff",
          "      }}",
          "    >",
          "      Add",
          "    </button>",
          "  )",
          "}",
        ],
        "src/nextCount.ts": ["export const nextCount = (count) => {", "  return count + 2 // diff", "}"],
      })

      expect(pathsOf(flow)).toStrictEqual(["[A user clicks Add] → Counter.onClick (changed)", "Counter.onClick (changed) → nextCount (changed)"])
      expect(entryPointsOf(flow)).toStrictEqual(["user-action: A user clicks Add"])
    })

    it("draws the component that holds a changed handler on a built-in element", () => {
      const flow = journeyOf(changing(FRONTEND_REPOSITORY, { "src/components/ProductCard.tsx": ["onAdd(product)"] }))

      expect(pathsOf(flow)).toStrictEqual([
        "[A user clicks Add to cart] → ProductCard.onClick (changed)",
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
      const flow = journeyOf(changing(FRONTEND_REPOSITORY, { "src/pages/CartPage.tsx": ["Your cart is empty"], "src/store/cart.ts": ["selectItems"] }))

      expect(pathsOf(flow)).toStrictEqual([
        "[A user clicks the button] → CartPage.handleCheckout through Button.onClick, CheckoutButton.onCheckout",
        "[A user visits /cart] → CartPage (changed)",
        "CartPage (changed) → selectItems (changed)",
        "CartPage.handleCheckout → selectItems (changed)",
      ])
      expect(tracedLinesOf(flow, "CartPage")).toContain("22: {items.length > 0 ? <CartSummary items={items} /> : <p>Your cart is empty</p>} (changed)")
    })

    it("gives the statement that mounts the app a top level node", () => {
      const flow = journeyOf(changing(FRONTEND_REPOSITORY, { "src/main.tsx": ["createRoot(document"] }))

      expect(pathsOf(flow)).toStrictEqual(["[The app starts] → src/main.tsx, top level (changed)"])
    })

    it("draws a component whose only path is its own entry point", () => {
      const flow = journeyOf(changing(FRONTEND_REPOSITORY, { "src/pages/CartPage.tsx": ["Your cart is empty"] }))

      expect(pathsOf(flow)).toStrictEqual(["[A user visits /cart] → CartPage (changed)"])
    })

    it("draws a changed handler with the action that runs it and nothing else", () => {
      const flow = journeyOf(changing(FRONTEND_REPOSITORY, { "src/pages/CartPage.tsx": ["clearDraft"] }))

      expect(pathsOf(flow)).toStrictEqual(["[A user triggers openchange on the Dialog] → CartPage.handleClose (changed)"])
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
        "[A user submits the form] → SignUpPage.handleSubmit",
        "[A user visits /cart] → CartPage",
        "CartPage → CartSummary (if items.length > 0)",
        "CartSummary → totalOf (changed)",
        "SignUpPage.handleSubmit → validateEmail (changed)",
      ])
    })
  })
})
