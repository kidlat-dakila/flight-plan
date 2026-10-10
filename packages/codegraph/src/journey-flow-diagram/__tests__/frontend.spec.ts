import { FRONTEND_REPOSITORY } from "./frontend-repository"
import { categoriesOf, changing, dataOf, entryPointsOf, eventsOf, handlerNodesOf, journeyOf, pathsOf, returnsOf, returnTracedLinesOf, tracedLinesOf } from "./journey-repository"

describe("the journey of a change in a frontend repository", () => {
  describe("a change in shared code", () => {
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

    it("lists the returns of a component that has several, each with its statement, its lines and the nodes it renders", () => {
      const flow = journeyOf(changing(FRONTEND_REPOSITORY, { "src/lib/formatPrice.ts": ["toFixed"] }))

      expect(returnsOf(flow, "HomePage")).toStrictEqual([
        "if (isLoading) return :9-9 | none",
        "return :11-11 | none | src/components/ProductGrid.tsx#ProductGrid",
      ])
      expect(returnsOf(flow, "CartSummary")).toStrictEqual([])
      expect(returnsOf(flow, "formatPrice")).toStrictEqual([])
    })

    it("lists the lines stepped through up to a return, and marks the return a changed line is on", () => {
      const flow = journeyOf(changing(FRONTEND_REPOSITORY, { "src/pages/HomePage.tsx": ["return <Spinner />"] }))

      expect(returnsOf(flow, "HomePage").map((described) => described.split(" | ").slice(0, 2).join(" | "))).toStrictEqual([
        "if (isLoading) return :9-9 | diff",
        "return :11-11 | none",
      ])
      expect(returnTracedLinesOf(flow, "HomePage", "if (isLoading) return")).toStrictEqual([
        "6: const { data, isLoading } = useProducts()",
        "7: const addToCart = useCartStore((state) => state.add)",
        "9: if (isLoading) return <Spinner /> (changed)",
      ])
    })

    it("gives the category ui to a component and logic to any other node", () => {
      const flow = journeyOf(changing(FRONTEND_REPOSITORY, { "src/lib/formatPrice.ts": ["toFixed"] }))

      expect(categoriesOf(flow)).toStrictEqual([
        "App: ui",
        "AppRoutes: ui",
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

    it("draws no node for a value a component reads in its markup, and marks the value on the component as related to the change", () => {
      const flow = journeyOf({
        "src/StatusFilter.tsx": [
          "const STATUSES = [\"open\", \"shipped\"] // diff",
          "export const StatusFilter = () => (",
          "  <ul>",
          "    {STATUSES.map((status) => <li key={status}>{status}</li>)}",
          "  </ul>",
          ")",
        ],
      })

      expect(pathsOf(flow)).toStrictEqual(["[A user visits the page] → StatusFilter"])
      expect(dataOf(flow, "StatusFilter")).toStrictEqual(["STATUSES @4 (related)"])
    })

    it("draws no node for a function handed to a hook when a component reads the result in its markup", () => {
      const flow = journeyOf({
        "src/store.ts": ["export const useFilterStore = create(() => ({ status: null }))", "export const selectStatus = (state) => {", "  return state.status // diff", "}"],
        "src/StatusLabel.tsx": [
          "import { selectStatus, useFilterStore } from \"./store\"",
          "export const StatusLabel = () => {",
          "  const status = useFilterStore(selectStatus)",
          "  return <strong>{status}</strong>",
          "}",
        ],
      })

      expect(pathsOf(flow)).not.toContain("StatusLabel → selectStatus (changed)")
      expect(dataOf(flow, "StatusLabel")).toStrictEqual(["status @4 (related)"])
    })

    it("keeps the node of a value that code outside the markup uses too, and of a function the markup calls", () => {
      const flow = journeyOf({
        "src/StatusFilter.tsx": [
          "const STATUSES = [\"open\", \"shipped\"] // diff",
          "const labelOf = (status) => status.toUpperCase() // diff",
          "const firstStatus = () => STATUSES[0]",
          "export const StatusFilter = () => (",
          "  <ul>",
          "    {STATUSES.map((status) => <li key={status}>{labelOf(status)}{firstStatus()}</li>)}",
          "  </ul>",
          ")",
        ],
      })

      expect(pathsOf(flow)).toStrictEqual([
        "[A user visits the page] → StatusFilter",
        "firstStatus → STATUSES (changed)",
        "StatusFilter → firstStatus",
        "StatusFilter → labelOf (changed)",
        "StatusFilter → STATUSES (changed)",
      ])
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
  })

  describe("a change in data fetching", () => {
    it("names the click that runs a mutation function handed to a hook through a wrapper", () => {
      const flow = journeyOf(changing(FRONTEND_REPOSITORY, { "src/api/orders.ts": ["response.json"] }))

      expect(pathsOf(flow)).toStrictEqual([
        "[A user clicks the button] → CartPage.handleCheckout through Button.onClick, CheckoutButton.onCheckout",
        "CartPage.handleCheckout → placeOrder (changed)",
      ])
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
  })

  describe("a change in what is rendered", () => {
    it("draws a changed route table under the app that renders it", () => {
      const flow = journeyOf(changing(FRONTEND_REPOSITORY, { "src/routes.tsx": ["path=\"/cart\""] }))

      expect(pathsOf(flow)).toStrictEqual(["[A user visits the page] → App", "App → AppRoutes (changed)"])
    })

    it("lists every line of a changed return, with the changed line marked", () => {
      const flow = journeyOf(changing(FRONTEND_REPOSITORY, { "src/pages/CartPage.tsx": ["Your cart is empty"], "src/store/cart.ts": ["selectItems"] }))

      expect(pathsOf(flow)).toContain("AppRoutes → CartPage (changed)")
      expect(tracedLinesOf(flow, "CartPage")).toContain("22: {items.length > 0 ? <CartSummary items={items} /> : <p>Your cart is empty</p>} (changed)")
    })

    it("gives the statement that mounts the app a top level node", () => {
      const flow = journeyOf(changing(FRONTEND_REPOSITORY, { "src/main.tsx": ["createRoot(document"] }))

      expect(pathsOf(flow)).toStrictEqual(["[The app starts] → src/main.tsx, top level (changed)"])
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
})
