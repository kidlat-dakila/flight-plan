import { join } from "node:path"
import { buildBranchCodegraph } from "@flightplan/codegraph"
import { assembleGitAdapter, type GitAdapter, type TargetRef } from "@flightplan/git-forge"
import { CASE_BRANCH } from "@test-setup/case-adapter"
import { expectCaseSnapshot } from "@test-setup/case-snapshot"
import { setupTest } from "@test-setup/setup-test"

const REPO_PATH = join(import.meta.dirname, "repo")
const CASE_REF: TargetRef = { kind: "branch", name: CASE_BRANCH }

const openRepository = async (root: string): Promise<GitAdapter> => {
  const resolved = await assembleGitAdapter({ id: "git", root, secret: null, username: "", baseUrl: "" })
  if (!resolved.ok) throw resolved.error
  return resolved.gitAdapter
}

describe("react-spa-query-zustand", () => {
  it("Modified function formatPrice to round to the nearest cent", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/lib/format.ts b/src/lib/format.ts",
          "--- a/src/lib/format.ts",
          "+++ b/src/lib/format.ts",
          "@@ -6 +6 @@ export function formatPrice(priceCents: number): string {",
          "-  return priceFormatter.format(Math.floor(priceCents) / CENTS_PER_UNIT)",
          "+  return priceFormatter.format(Math.round(priceCents) / CENTS_PER_UNIT)",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF })

    await expectCaseSnapshot({
      context: [
        "## Summary",
        "",
        "A price with a fraction of a cent is rounded to the nearest cent. It was cut down to the cent below before.",
        "",
        "## Changes",
        "",
        "- `formatPrice` in `src/lib/format.ts` rounds `priceCents` with `Math.round`. It used `Math.floor` before. One line changes, inside the function.",
        "",
        "## Reach",
        "",
        "- `ProductCard` calls `formatPrice` for the price of a product, so the catalogue page shows the new rounding.",
        "- `CartLine` calls it for the total of a line and `CartSummary` for the total of the cart, so the cart page shows it too.",
        "- The account page does not format a price and is not reached.",
      ].join("\n"),
      codegraph,
      segments: [
        {
          title: "Price formatting",
          journeyFlowDiagram: {
            title: "A price is shown to a shopper",
            nodes: {
              "entry:src/router.tsx#router": {
                label: "A shopper opens the catalogue or the cart",
                description: "The router renders the page of the address.",
              },
              "src/router.tsx#router": {
                label: "Route table",
                description: "Renders the catalogue at `/` and the cart at `/cart`.",
                category: "config",
              },
              "src/routes/catalog/index.tsx#CatalogPage": {
                label: "Catalogue page",
                description: "Lists the products, one card each.",
                category: "ui",
              },
              "src/routes/catalog/components/ProductCard.tsx#ProductCard": {
                label: "Product card",
                description: "Shows the price of a product.",
                category: "ui",
              },
              "src/routes/cart/index.tsx#CartPage": {
                label: "Cart page",
                description: "Lists the lines of the cart, then its summary.",
                category: "ui",
              },
              "src/routes/cart/components/CartLine.tsx#CartLine": {
                label: "Cart line",
                description: "Shows the total of a line: the price times the quantity.",
                category: "ui",
              },
              "src/routes/cart/components/CartSummary.tsx#CartSummary": {
                label: "Cart summary",
                description: "Shows the total of the cart.",
                category: "ui",
              },
              "src/lib/format.ts#formatPrice": {
                label: "Format a price",
                description: "Rounds an amount in cents to the nearest cent and writes it in US dollars.",
                category: "logic",
              },
            },
          },
          blastRadiusDiagram: {
            nodes: {
              "src/lib/format.ts#formatPrice": {
                label: "Format a price",
                contract: {
                  before: "Cut a fraction of a cent off: 199.9 cents was written as $1.99.",
                  now: "Rounds to the nearest cent: 199.9 cents is written as $2.00.",
                },
                effect: "An amount with half a cent or more is written one cent higher.",
              },
              "src/routes/catalog/components/ProductCard.tsx#ProductCard": {
                label: "Product card",
                verdict: "unaffected",
                effect: "A product's price is a whole number of cents, so the card shows the same price.",
              },
              "src/routes/cart/components/CartLine.tsx#CartLine": {
                label: "Cart line",
                verdict: "unaffected",
                effect: "A whole price times a whole quantity has no fraction to round.",
              },
              "src/routes/cart/components/CartSummary.tsx#CartSummary": {
                label: "Cart summary",
                verdict: "unaffected",
                effect: "The total is a sum of whole cents.",
              },
              "src/routes/catalog/index.tsx#CatalogPage": {
                label: "Catalogue page",
                verdict: "unaffected",
                effect: "Shows the cards as before.",
              },
              "src/routes/cart/index.tsx#CartPage": {
                label: "Cart page",
                verdict: "unaffected",
                effect: "Shows the lines and the summary as before.",
              },
              "src/router.tsx#router": {
                label: "Route table",
                verdict: "unaffected",
                effect: "Routes are not changed.",
              },
            },
          },
          codeWalkthrough: {
            intro: "One line changes, in the function every price on the site goes through.",
            files: {
              "src/lib/format.ts": {
                title: "Price formatting",
                summary: [
                  "`formatPrice` rounds to the nearest cent. It rounded down before.",
                ],
                waypoints: {
                  formatPrice: {
                    title: "Round to the nearest cent",
                    reading: "`Math.floor` became `Math.round`. Every caller passes a whole number of cents today, so nothing on screen changes. An amount with a fraction, such as a discounted price, would now go up from half a cent instead of always going down.",
                  },
                },
              },
            },
          },
        },
      ],
    })
  })

  it("Modified store useCartStore to merge repeated items", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/stores/cart-store.ts b/src/stores/cart-store.ts",
          "--- a/src/stores/cart-store.ts",
          "+++ b/src/stores/cart-store.ts",
          "@@ -14 +14,9 @@ export const useCartStore = create<CartState>((set) => ({",
          "-    set((state) => ({ items: [...state.items, { product, quantity: 1 }] }))",
          "+    set((state) => {",
          "+      const isInCart = state.items.some((item) => item.product.id === product.id)",
          "+      if (!isInCart) return { items: [...state.items, { product, quantity: 1 }] }",
          "+      return {",
          "+        items: state.items.map((item) =>",
          "+          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,",
          "+        ),",
          "+      }",
          "+    })",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF })

    await expectCaseSnapshot({
      context: [
        "## Summary",
        "",
        "Adding a product that is already in the cart raises the quantity of its line. It added a second line for the same product before.",
        "",
        "## Changes",
        "",
        "- The `addItem` action of `useCartStore` in `src/stores/cart-store.ts` looks for the product in `items`. When it is there, the action returns the items with that line's quantity raised by one. When it is not, it appends a line with quantity 1, as before.",
        "- `addItem` is a member of the object handed to Zustand's `create`. The change is inside that object, not in a function declared on its own.",
        "",
        "## Reach",
        "",
        "- `AddToCartButton` reads `addItem` from the store and calls it on a click. It is the only writer.",
        "- `CartPage` reads `items` and renders one `CartLine` per entry, so it now shows one line per product. `CartLine` shows a quantity above 1 for the first time.",
        "- `CartBadge` and `CartSummary` read the store through `selectItemCount` and `selectTotalCents`. Their numbers stay the same, because the quantities still add up.",
        "- No reader imports the writer: they meet only in `useCartStore`.",
      ].join("\n"),
      codegraph,
    })
  })

  it("Modified function fetchProducts to request products sorted by name", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/api/products.ts b/src/api/products.ts",
          "--- a/src/api/products.ts",
          "+++ b/src/api/products.ts",
          "@@ -5 +5 @@ export function fetchProducts(): Promise<Product[]> {",
          "-  return request<Product[]>(\"/products\")",
          "+  return request<Product[]>(\"/products?sort=name\")",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF })

    await expectCaseSnapshot({
      context: [
        "## Summary",
        "",
        "The catalogue asks the API for its products sorted by name.",
        "",
        "## Changes",
        "",
        "- `fetchProducts` in `src/api/products.ts` requests `/products?sort=name`. It requested `/products` before. One line changes, inside the function.",
        "",
        "## Reach",
        "",
        "- Nothing in the repository calls `fetchProducts`. `useProducts` hands it to TanStack Query as a value, `queryFn: fetchProducts`, and the library calls it.",
        "- `CatalogPage` reads the result of `useProducts` and renders the products in the order they arrive.",
        "- `fetchProducts` calls `request` in `src/api/client.ts`, which is below the change and not changed.",
        "- The cart and the account page do not load products and are not reached.",
      ].join("\n"),
      codegraph,
    })
  })

  it("Modified component Button to show a loading state", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/components/ui/button.tsx b/src/components/ui/button.tsx",
          "--- a/src/components/ui/button.tsx",
          "+++ b/src/components/ui/button.tsx",
          "@@ -7,0 +8 @@ interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {",
          "+  isLoading?: boolean",
          "@@ -15,2 +16,17 @@ const VARIANT_CLASSES: Record<ButtonVariant, string> = {",
          "-export function Button({ variant = \"primary\", className, ...props }: ButtonProps) {",
          "-  return <button className={cn(\"rounded px-3 py-2\", VARIANT_CLASSES[variant], className)} {...props} />",
          "+export function Button({",
          "+  variant = \"primary\",",
          "+  isLoading = false,",
          "+  className,",
          "+  disabled,",
          "+  children,",
          "+  ...props",
          "+}: ButtonProps) {",
          "+  return (",
          "+    <button",
          "+      className={cn(\"rounded px-3 py-2\", VARIANT_CLASSES[variant], className)}",
          "+      disabled={disabled || isLoading}",
          "+      {...props}",
          "+    >",
          "+      {isLoading ? \"Loading…\" : children}",
          "+    </button>",
          "+  )",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF })

    await expectCaseSnapshot({
      context: [
        "## Summary",
        "",
        "The shared button can show that it is busy: it reads \"Loading…\" and cannot be clicked.",
        "",
        "## Changes",
        "",
        "- `ButtonProps` in `src/components/ui/button.tsx` gains an optional `isLoading` property. This is a change to a type.",
        "- `Button` takes `isLoading`, `disabled` and `children` out of its props. It is disabled when either `disabled` or `isLoading` is set, and renders \"Loading…\" in place of its children while loading. Its one-line body becomes a multi-line element.",
        "",
        "## Reach",
        "",
        "- `Button` is the most used component of the repository. `RootLayout`, `AddToCartButton`, `CartLine`, `CartSummary` and `ProfileForm` import it through the barrel `src/components/ui/index.ts`.",
        "- `Dialog` imports it straight from `src/components/ui/button.tsx`, not through the barrel.",
        "- Every page renders a `Button`, so all three routes are reached.",
        "- No caller passes `isLoading` yet, so nothing looks different until one does.",
      ].join("\n"),
      codegraph,
    })
  })

  it("Modified function formatPrice to take a currency", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/lib/format.ts b/src/lib/format.ts",
          "--- a/src/lib/format.ts",
          "+++ b/src/lib/format.ts",
          "@@ -3 +3 @@ const CENTS_PER_UNIT = 100",
          "-const priceFormatter = new Intl.NumberFormat(\"en-US\", { style: \"currency\", currency: \"USD\" })",
          "+export const STORE_CURRENCY = \"USD\"",
          "@@ -5 +5,2 @@ const priceFormatter = new Intl.NumberFormat(\"en-US\", { style: \"currency\", curre",
          "-export function formatPrice(priceCents: number): string {",
          "+export function formatPrice(priceCents: number, currency: string): string {",
          "+  const priceFormatter = new Intl.NumberFormat(\"en-US\", { style: \"currency\", currency })",
        ].join("\n"),
        [
          "diff --git a/src/routes/cart/components/CartLine.tsx b/src/routes/cart/components/CartLine.tsx",
          "--- a/src/routes/cart/components/CartLine.tsx",
          "+++ b/src/routes/cart/components/CartLine.tsx",
          "@@ -2 +2 @@ import { Button } from \"@/components/ui\"",
          "-import { formatPrice, formatQuantity } from \"@/lib/format\"",
          "+import { formatPrice, formatQuantity, STORE_CURRENCY } from \"@/lib/format\"",
          "@@ -12 +12 @@ export function CartLine({ item }: { item: CartItem }) {",
          "-      <span>{formatPrice(item.product.priceCents * item.quantity)}</span>",
          "+      <span>{formatPrice(item.product.priceCents * item.quantity, STORE_CURRENCY)}</span>",
        ].join("\n"),
        [
          "diff --git a/src/routes/cart/components/CartSummary.tsx b/src/routes/cart/components/CartSummary.tsx",
          "--- a/src/routes/cart/components/CartSummary.tsx",
          "+++ b/src/routes/cart/components/CartSummary.tsx",
          "@@ -3 +3 @@ import { Button, Dialog } from \"@/components/ui\"",
          "-import { formatPrice } from \"@/lib/format\"",
          "+import { formatPrice, STORE_CURRENCY } from \"@/lib/format\"",
          "@@ -18 +18 @@ export function CartSummary() {",
          "-      <p>Total: {formatPrice(totalCents)}</p>",
          "+      <p>Total: {formatPrice(totalCents, STORE_CURRENCY)}</p>",
        ].join("\n"),
        [
          "diff --git a/src/routes/catalog/components/ProductCard.tsx b/src/routes/catalog/components/ProductCard.tsx",
          "--- a/src/routes/catalog/components/ProductCard.tsx",
          "+++ b/src/routes/catalog/components/ProductCard.tsx",
          "@@ -1 +1 @@",
          "-import { formatPrice } from \"@/lib/format\"",
          "+import { formatPrice, STORE_CURRENCY } from \"@/lib/format\"",
          "@@ -10 +10 @@ export function ProductCard({ product }: { product: Product }) {",
          "-      <p>{formatPrice(product.priceCents)}</p>",
          "+      <p>{formatPrice(product.priceCents, STORE_CURRENCY)}</p>",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF })

    await expectCaseSnapshot({
      context: [
        "## Summary",
        "",
        "A price is formatted in the currency its caller names. Every price was formatted in US dollars before.",
        "",
        "## Changes",
        "",
        "- `formatPrice` in `src/lib/format.ts` takes a second parameter, `currency`, and builds its `Intl.NumberFormat` from it on each call.",
        "- The module-level `priceFormatter`, which was fixed to USD, is deleted.",
        "- A new exported constant, `STORE_CURRENCY`, holds `\"USD\"`.",
        "- The three callers pass `STORE_CURRENCY` and import it beside `formatPrice`: `ProductCard`, `CartLine` and `CartSummary`. Each of those files changes on two lines, its import and its call.",
        "",
        "## Reach",
        "",
        "- This is a change of signature made together with every call site: four files, one function declaration, three calls.",
        "- The catalogue page is reached through `ProductCard`, and the cart page through `CartLine` and `CartSummary`.",
        "- What the pages show does not change, because every caller passes the currency that was fixed before.",
        "- The account page is not reached.",
      ].join("\n"),
      codegraph,
    })
  })

  it("Added selector selectIsCartEmpty to the cart store", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/routes/cart/index.tsx b/src/routes/cart/index.tsx",
          "--- a/src/routes/cart/index.tsx",
          "+++ b/src/routes/cart/index.tsx",
          "@@ -1 +1 @@",
          "-import { useCartStore } from \"@/stores/cart-store\"",
          "+import { selectIsCartEmpty, useCartStore } from \"@/stores/cart-store\"",
          "@@ -7 +7,2 @@ export function CartPage() {",
          "-  if (items.length === 0) return <p>Your cart is empty.</p>",
          "+  const isCartEmpty = useCartStore(selectIsCartEmpty)",
          "+  if (isCartEmpty) return <p>Your cart is empty.</p>",
        ].join("\n"),
        [
          "diff --git a/src/stores/cart-store.ts b/src/stores/cart-store.ts",
          "--- a/src/stores/cart-store.ts",
          "+++ b/src/stores/cart-store.ts",
          "@@ -30,0 +31,4 @@ export function selectTotalCents(state: CartState): number {",
          "+",
          "+export function selectIsCartEmpty(state: CartState): boolean {",
          "+  return state.items.length === 0",
          "+}",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF })

    await expectCaseSnapshot({
      context: [
        "## Summary",
        "",
        "The cart page asks the store whether the cart is empty, instead of reading every item to find out.",
        "",
        "## Changes",
        "",
        "- `src/stores/cart-store.ts` gains `selectIsCartEmpty`, a new exported function at the end of the file. It returns whether `items` is empty.",
        "- `CartPage` in `src/routes/cart/index.tsx` imports it, reads `useCartStore(selectIsCartEmpty)` into `isCartEmpty`, and returns the empty message on that value. It tested `items.length === 0` before.",
        "",
        "## Reach",
        "",
        "- A new declaration and its first use arrive together: one added function, one modified component.",
        "- `selectIsCartEmpty` is passed to `useCartStore` as a value. `CartPage` never calls it.",
        "- Only the cart route is reached. `selectItemCount` and `selectTotalCents`, the two selectors beside the new one, are not changed.",
      ].join("\n"),
      codegraph,
      segments: [
        {
          title: "Empty cart check",
          journeyFlowDiagram: {
            title: "A shopper opens the cart",
            nodes: {
              "entry:src/router.tsx#router": {
                label: "A shopper opens the cart",
                description: "The router renders the page at `/cart`.",
              },
              "src/router.tsx#router": {
                label: "Route table",
                description: "Renders `CartPage` at `/cart`.",
                category: "config",
              },
              "src/routes/cart/index.tsx#CartPage": {
                label: "Cart page",
                description: "Asks the store whether the cart is empty before it lists the lines.",
                category: "ui",
              },
              "src/stores/cart-store.ts#selectIsCartEmpty": {
                label: "Is the cart empty?",
                description: "Returns true when the store holds no items.",
                category: "data",
              },
            },
          },
          blastRadiusDiagram: {
            nodes: {
              "src/stores/cart-store.ts#selectIsCartEmpty": {
                label: "Is the cart empty?",
                contract: {
                  before: null,
                  now: "Takes the state of the cart and returns whether it has no items.",
                },
                effect: "New. Only the cart page uses it.",
              },
              "src/routes/cart/index.tsx#CartPage": {
                label: "Cart page",
                contract: {
                  before: "Showed the empty message when `items.length` was 0.",
                  now: "Shows the empty message when `selectIsCartEmpty` says the cart is empty.",
                },
                effect: "The same message in the same case. The page now reads the store twice: once for the items, once for the answer.",
              },
              "src/router.tsx#router": {
                label: "Route table",
                verdict: "unaffected",
                effect: "Still renders the cart page at `/cart`.",
              },
            },
          },
          codeWalkthrough: {
            intro: "A selector is added to the store, and the cart page starts using it.",
            files: {
              "src/routes/cart/index.tsx": {
                title: "Cart page",
                summary: [
                  "The page asks the store whether the cart is empty, instead of counting the items itself.",
                ],
                waypoints: {
                  "Lines 1–1": {
                    title: "Import the new selector",
                    reading: "`selectIsCartEmpty` is imported beside `useCartStore`, from the same file.",
                  },
                  "CartPage": {
                    title: "Ask the store instead of counting",
                    reading: "`isCartEmpty` comes from `useCartStore(selectIsCartEmpty)`, and the early return tests it. `items` is still read, because the list below needs it.",
                  },
                },
              },
              "src/stores/cart-store.ts": {
                title: "Cart store",
                summary: [
                  "A third selector, beside `selectItemCount` and `selectTotalCents`.",
                ],
                waypoints: {
                  selectIsCartEmpty: {
                    title: "The new selector",
                    reading: "A function of the state that returns `items.length === 0`. It is handed to `useCartStore` as a value and never called by name.",
                  },
                },
              },
            },
          },
        },
      ],
    })
  })

  it("Implement page Wishlist", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/router.tsx b/src/router.tsx",
          "--- a/src/router.tsx",
          "+++ b/src/router.tsx",
          "@@ -5,0 +6 @@ import { RootLayout } from \"@/routes/root-layout\"",
          "+import { WishlistPage } from \"@/routes/wishlist\"",
          "@@ -14,0 +16 @@ export const router = createBrowserRouter([",
          "+      { path: \"wishlist\", element: <WishlistPage /> },",
        ].join("\n"),
        [
          "diff --git a/src/routes/catalog/components/ProductCard.tsx b/src/routes/catalog/components/ProductCard.tsx",
          "--- a/src/routes/catalog/components/ProductCard.tsx",
          "+++ b/src/routes/catalog/components/ProductCard.tsx",
          "@@ -3,0 +4 @@ import { AddToCartButton } from \"./AddToCartButton\"",
          "+import { WishlistButton } from \"./WishlistButton\"",
          "@@ -11,0 +13 @@ export function ProductCard({ product }: { product: Product }) {",
          "+      <WishlistButton product={product} />",
        ].join("\n"),
        [
          "diff --git a/src/routes/catalog/components/WishlistButton.tsx b/src/routes/catalog/components/WishlistButton.tsx",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/routes/catalog/components/WishlistButton.tsx",
          "@@ -0,0 +1,13 @@",
          "+import { Button } from \"@/components/ui\"",
          "+import { selectIsWished, useWishlistStore } from \"@/stores/wishlist-store\"",
          "+import type { Product } from \"@/types/product\"",
          "+",
          "+export function WishlistButton({ product }: { product: Product }) {",
          "+  const isWished = useWishlistStore(selectIsWished(product.id))",
          "+  const toggleProduct = useWishlistStore((state) => state.toggleProduct)",
          "+  return (",
          "+    <Button variant=\"ghost\" onClick={() => toggleProduct(product)}>",
          "+      {isWished ? \"Remove from wishlist\" : \"Add to wishlist\"}",
          "+    </Button>",
          "+  )",
          "+}",
        ].join("\n"),
        [
          "diff --git a/src/routes/root-layout.tsx b/src/routes/root-layout.tsx",
          "--- a/src/routes/root-layout.tsx",
          "+++ b/src/routes/root-layout.tsx",
          "@@ -12,0 +13 @@ export function RootLayout() {",
          "+        <Link to=\"/wishlist\">Wishlist</Link>",
        ].join("\n"),
        [
          "diff --git a/src/routes/wishlist/index.tsx b/src/routes/wishlist/index.tsx",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/routes/wishlist/index.tsx",
          "@@ -0,0 +1,16 @@",
          "+import { ProductCard } from \"@/routes/catalog/components/ProductCard\"",
          "+import { useWishlistStore } from \"@/stores/wishlist-store\"",
          "+",
          "+export function WishlistPage() {",
          "+  const products = useWishlistStore((state) => state.products)",
          "+  if (products.length === 0) return <p>Your wishlist is empty.</p>",
          "+  return (",
          "+    <ul>",
          "+      {products.map((product) => (",
          "+        <li key={product.id}>",
          "+          <ProductCard product={product} />",
          "+        </li>",
          "+      ))}",
          "+    </ul>",
          "+  )",
          "+}",
        ].join("\n"),
        [
          "diff --git a/src/stores/wishlist-store.ts b/src/stores/wishlist-store.ts",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/stores/wishlist-store.ts",
          "@@ -0,0 +1,22 @@",
          "+import { create } from \"zustand\"",
          "+import type { Product } from \"@/types/product\"",
          "+",
          "+interface WishlistState {",
          "+  products: Product[]",
          "+  toggleProduct: (product: Product) => void",
          "+}",
          "+",
          "+export const useWishlistStore = create<WishlistState>((set) => ({",
          "+  products: [],",
          "+  toggleProduct: (product) => {",
          "+    set((state) => ({",
          "+      products: state.products.some((wished) => wished.id === product.id)",
          "+        ? state.products.filter((wished) => wished.id !== product.id)",
          "+        : [...state.products, product],",
          "+    }))",
          "+  },",
          "+}))",
          "+",
          "+export function selectIsWished(productId: string) {",
          "+  return (state: WishlistState): boolean => state.products.some((wished) => wished.id === productId)",
          "+}",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF })

    await expectCaseSnapshot({
      context: [
        "## Summary",
        "",
        "A shopper can put a product on a wishlist from the catalogue and see the list on a page of its own, at `/wishlist`.",
        "",
        "## Changes",
        "",
        "Three new files:",
        "",
        "- `src/stores/wishlist-store.ts` holds `useWishlistStore`, a Zustand store with `products` and a `toggleProduct` action, and `selectIsWished`, a function that returns a selector for one product id.",
        "- `src/routes/catalog/components/WishlistButton.tsx` holds `WishlistButton`. It reads whether its product is wished and toggles it on a click.",
        "- `src/routes/wishlist/index.tsx` holds `WishlistPage`. It lists the wished products with `ProductCard`, or says the wishlist is empty.",
        "",
        "Three modified files:",
        "",
        "- `ProductCard` imports `WishlistButton` and renders it under `AddToCartButton`.",
        "- `src/router.tsx` imports `WishlistPage` and adds the route `wishlist` to the children of the root route.",
        "- `RootLayout` adds a link to `/wishlist` in the header.",
        "",
        "## Reach",
        "",
        "- `WishlistPage` is a new page under the router, reached through the new route.",
        "- `ProductCard` is rendered by `CatalogPage` and now by `WishlistPage` too, so the catalogue shows a wishlist button on every card.",
        "- `WishlistButton` writes the store and `WishlistPage` reads it. They do not import each other.",
        "- `RootLayout` wraps every route, so the new link is on every page.",
        "- The cart and the account features are not changed.",
      ].join("\n"),
      codegraph,
    })
  })

  it("Deleted component Dialog", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/components/ui/dialog.tsx b/src/components/ui/dialog.tsx",
          "deleted file mode 100644",
          "--- a/src/components/ui/dialog.tsx",
          "+++ /dev/null",
          "@@ -1,22 +0,0 @@",
          "-import type { ReactNode } from \"react\"",
          "-import { Button } from \"@/components/ui/button\"",
          "-",
          "-interface DialogProps {",
          "-  title: string",
          "-  open: boolean",
          "-  onClose: () => void",
          "-  children: ReactNode",
          "-}",
          "-",
          "-export function Dialog({ title, open, onClose, children }: DialogProps) {",
          "-  if (!open) return null",
          "-  return (",
          "-    <div role=\"dialog\" aria-label={title}>",
          "-      <h2>{title}</h2>",
          "-      {children}",
          "-      <Button variant=\"ghost\" onClick={onClose}>",
          "-        Close",
          "-      </Button>",
          "-    </div>",
          "-  )",
          "-}",
        ].join("\n"),
        [
          "diff --git a/src/components/ui/index.ts b/src/components/ui/index.ts",
          "--- a/src/components/ui/index.ts",
          "+++ b/src/components/ui/index.ts",
          "@@ -2 +1,0 @@ export { Button } from \"./button\"",
          "-export { Dialog } from \"./dialog\"",
        ].join("\n"),
        [
          "diff --git a/src/routes/cart/components/CartSummary.tsx b/src/routes/cart/components/CartSummary.tsx",
          "--- a/src/routes/cart/components/CartSummary.tsx",
          "+++ b/src/routes/cart/components/CartSummary.tsx",
          "@@ -1,2 +1 @@",
          "-import { useState } from \"react\"",
          "-import { Button, Dialog } from \"@/components/ui\"",
          "+import { Button } from \"@/components/ui\"",
          "@@ -9,6 +7,0 @@ export function CartSummary() {",
          "-  const [isConfirming, setIsConfirming] = useState(false)",
          "-",
          "-  function handleConfirm() {",
          "-    clear()",
          "-    setIsConfirming(false)",
          "-  }",
          "@@ -19 +12 @@ export function CartSummary() {",
          "-      <Button variant=\"ghost\" onClick={() => setIsConfirming(true)}>",
          "+      <Button variant=\"ghost\" onClick={clear}>",
          "@@ -22,3 +14,0 @@ export function CartSummary() {",
          "-      <Dialog title=\"Empty the cart?\" open={isConfirming} onClose={() => setIsConfirming(false)}>",
          "-        <Button onClick={handleConfirm}>Empty it</Button>",
          "-      </Dialog>",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF })

    await expectCaseSnapshot({
      context: [
        "## Summary",
        "",
        "Emptying the cart no longer asks for confirmation. The dialog that asked is removed from the shared components.",
        "",
        "## Changes",
        "",
        "- `src/components/ui/dialog.tsx` is deleted. It held `Dialog` and its `DialogProps`.",
        "- The barrel `src/components/ui/index.ts` no longer exports `Dialog`.",
        "- `CartSummary` drops everything it needed for the dialog: the `useState` import, the `Dialog` import, the `isConfirming` state, the inner function `handleConfirm` and the `<Dialog>` element. The \"Empty the cart\" button now calls `clear` directly.",
        "",
        "## Reach",
        "",
        "- `CartSummary` was the only user of `Dialog`, so nothing else loses it.",
        "- `Dialog` imported `Button` from `src/components/ui/button.tsx`. `Button` has one user fewer and is not changed.",
        "- Only the cart route is reached: `CartPage` renders `CartSummary`.",
        "- The barrel is imported by every feature, but its remaining exports, `Button` and `Input`, are untouched.",
      ].join("\n"),
      codegraph,
    })
  })

  it("Deleted function formatQuantity", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/lib/format.ts b/src/lib/format.ts",
          "--- a/src/lib/format.ts",
          "+++ b/src/lib/format.ts",
          "@@ -8,4 +7,0 @@ export function formatPrice(priceCents: number): string {",
          "-",
          "-export function formatQuantity(quantity: number): string {",
          "-  return quantity === 1 ? \"1 item\" : `${quantity} items`",
          "-}",
        ].join("\n"),
        [
          "diff --git a/src/routes/cart/components/CartLine.tsx b/src/routes/cart/components/CartLine.tsx",
          "--- a/src/routes/cart/components/CartLine.tsx",
          "+++ b/src/routes/cart/components/CartLine.tsx",
          "@@ -2 +2 @@ import { Button } from \"@/components/ui\"",
          "-import { formatPrice, formatQuantity } from \"@/lib/format\"",
          "+import { formatPrice } from \"@/lib/format\"",
          "@@ -11 +11 @@ export function CartLine({ item }: { item: CartItem }) {",
          "-      <span>{formatQuantity(item.quantity)}</span>",
          "+      <span>{item.quantity}</span>",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF })

    await expectCaseSnapshot({
      context: [
        "## Summary",
        "",
        "A line of the cart shows its quantity as a bare number. The wording \"1 item\" and \"3 items\" is gone.",
        "",
        "## Changes",
        "",
        "- `formatQuantity` is removed from `src/lib/format.ts`. Lines are only removed from that file: nothing is added in their place.",
        "- `CartLine` no longer imports `formatQuantity` and renders `item.quantity` as it is.",
        "",
        "## Reach",
        "",
        "- `CartLine` was the only caller of `formatQuantity`, and `CartPage` renders `CartLine`, so only the cart route is reached.",
        "- `formatPrice`, the other function of `src/lib/format.ts`, is not changed. `ProductCard` and `CartSummary` import that file for `formatPrice` alone and behave as before.",
      ].join("\n"),
      codegraph,
    })
  })

  it("Modified module use-profile to live beside the account page", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/routes/account/components/ProfileForm.tsx b/src/routes/account/components/ProfileForm.tsx",
          "--- a/src/routes/account/components/ProfileForm.tsx",
          "+++ b/src/routes/account/components/ProfileForm.tsx",
          "@@ -4 +4 @@ import { Button, Input } from \"@/components/ui\"",
          "-import { useUpdateProfile } from \"@/hooks/use-profile\"",
          "+import { useUpdateProfile } from \"@/routes/account/use-profile\"",
        ].join("\n"),
        [
          "diff --git a/src/routes/account/index.tsx b/src/routes/account/index.tsx",
          "--- a/src/routes/account/index.tsx",
          "+++ b/src/routes/account/index.tsx",
          "@@ -1 +1 @@",
          "-import { useProfile } from \"@/hooks/use-profile\"",
          "+import { useProfile } from \"./use-profile\"",
        ].join("\n"),
        [
          "diff --git a/src/hooks/use-profile.ts b/src/routes/account/use-profile.ts",
          "rename from src/hooks/use-profile.ts",
          "rename to src/routes/account/use-profile.ts",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF })

    await expectCaseSnapshot({
      context: [
        "## Summary",
        "",
        "The profile hooks move from the shared hooks folder to the account route, the only place that uses them. Nothing behaves differently.",
        "",
        "## Changes",
        "",
        "- `src/hooks/use-profile.ts` is renamed to `src/routes/account/use-profile.ts`. Its content is unchanged: `useProfile` and `useUpdateProfile` are the same, line for line.",
        "- `AccountPage` in `src/routes/account/index.tsx` imports `useProfile` from `./use-profile`. It imported it from `@/hooks/use-profile` before.",
        "- `ProfileForm` imports `useUpdateProfile` from `@/routes/account/use-profile`. It imported it from `@/hooks/use-profile` before.",
        "",
        "## Reach",
        "",
        "- Only import lines change. No function, component or value is modified.",
        "- The moved file still imports `fetchProfile` and `updateProfile` from `@/api/profile`, through the alias, so that import still resolves from its new folder.",
        "- One importer reaches the moved file by a relative path and the other by the alias.",
        "- Only the account route is involved.",
      ].join("\n"),
      codegraph,
    })
  })

  it("Modified type Product to carry a stock count", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/types/product.ts b/src/types/product.ts",
          "--- a/src/types/product.ts",
          "+++ b/src/types/product.ts",
          "@@ -5,0 +6 @@ export interface Product {",
          "+  stock: number",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF })

    await expectCaseSnapshot({
      context: [
        "## Summary",
        "",
        "A product knows how many units are in stock. Nothing shows or checks the number yet.",
        "",
        "## Changes",
        "",
        "- The interface `Product` in `src/types/product.ts` gains a required property, `stock: number`. One line is added, inside the interface.",
        "",
        "## Reach",
        "",
        "- This is a change to a type only. No function, component or value is modified, and no code reads `stock`.",
        "- `CartItem`, in the same file, holds a `Product`.",
        "- Five files import the type: `src/api/products.ts`, `src/stores/cart-store.ts`, `ProductCard`, `AddToCartButton` and `CartLine` (through `CartItem`).",
        "- At run time nothing changes.",
      ].join("\n"),
      codegraph,
    })
  })

  it("Modified schema profileSchema to require a phone number", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/routes/account/components/ProfileForm.tsx b/src/routes/account/components/ProfileForm.tsx",
          "--- a/src/routes/account/components/ProfileForm.tsx",
          "+++ b/src/routes/account/components/ProfileForm.tsx",
          "@@ -23,0 +24,2 @@ export function ProfileForm({ profile }: { profile: Profile }) {",
          "+      <Input aria-label=\"Phone\" {...register(\"phone\")} />",
          "+      {formState.errors.phone && <p>{formState.errors.phone.message}</p>}",
        ].join("\n"),
        [
          "diff --git a/src/routes/account/components/profile-schema.ts b/src/routes/account/components/profile-schema.ts",
          "--- a/src/routes/account/components/profile-schema.ts",
          "+++ b/src/routes/account/components/profile-schema.ts",
          "@@ -3,0 +4 @@ const NAME_MIN_LENGTH = 2",
          "+const PHONE_PATTERN = /^\\+?[0-9 ]{7,15}$/",
          "@@ -7,0 +9 @@ export const profileSchema = z.object({",
          "+  phone: z.string().regex(PHONE_PATTERN),",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF })

    await expectCaseSnapshot({
      context: [
        "## Summary",
        "",
        "A profile must have a phone number. The account form has a field for it and shows an error when it is not valid.",
        "",
        "## Changes",
        "",
        "- `src/routes/account/components/profile-schema.ts` gains a module-level constant, `PHONE_PATTERN`, a regular expression.",
        "- `profileSchema` gains the property `phone`, a string that must match `PHONE_PATTERN`. The schema is a value built by a call, `z.object({...})`, not a function.",
        "- The type `Profile` is inferred from the schema, so it gains `phone` without a line of its own changing.",
        "- `ProfileForm` renders a third `Input`, registered as `phone`, and the error message under it.",
        "",
        "## Reach",
        "",
        "- `ProfileForm` hands `profileSchema` to `zodResolver` as a value, so the form now refuses to submit without a valid phone number.",
        "- `Profile` is the type of what `fetchProfile` returns and what `updateProfile` sends in `src/api/profile.ts`. Both now carry `phone`, with no change in that file.",
        "- Only the account route is reached.",
      ].join("\n"),
      codegraph,
    })
  })

  it("Modified variable queryClient to retry a failed query once", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/lib/query-client.ts b/src/lib/query-client.ts",
          "--- a/src/lib/query-client.ts",
          "+++ b/src/lib/query-client.ts",
          "@@ -3,0 +4 @@ const STALE_TIME_MS = 30_000",
          "+const RETRY_COUNT = 1",
          "@@ -7 +8 @@ export const queryClient = new QueryClient({",
          "-    queries: { staleTime: STALE_TIME_MS, retry: false },",
          "+    queries: { staleTime: STALE_TIME_MS, retry: RETRY_COUNT },",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF })

    await expectCaseSnapshot({
      context: [
        "## Summary",
        "",
        "A request that fails is tried once more before the page shows an error. It was not retried before.",
        "",
        "## Changes",
        "",
        "- `src/lib/query-client.ts` gains a module-level constant, `RETRY_COUNT`, set to 1.",
        "- `queryClient` passes `retry: RETRY_COUNT` in its default options. It passed `retry: false` before. `queryClient` is a module-level value built by `new QueryClient(...)`, not a function.",
        "",
        "## Reach",
        "",
        "- `src/main.tsx` hands `queryClient` to `QueryClientProvider`, at the top level of the file, outside every function.",
        "- No hook imports `queryClient`. `useProducts` and `useProfile` get their defaults from the provider at run time, so the catalogue and the account page are affected without an import or a call leading to them.",
        "- `useUpdateProfile` is a mutation. The option is under `queries`, so it does not apply to it.",
      ].join("\n"),
      codegraph,
    })
  })

  it("Modified context ThemeProvider to remember the chosen theme", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/components/ThemeProvider.tsx b/src/components/ThemeProvider.tsx",
          "--- a/src/components/ThemeProvider.tsx",
          "+++ b/src/components/ThemeProvider.tsx",
          "@@ -1 +1 @@",
          "-import { createContext, useContext, useMemo, useState, type ReactNode } from \"react\"",
          "+import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from \"react\"",
          "@@ -9,0 +10,2 @@ interface ThemeContextValue {",
          "+const THEME_STORAGE_KEY = \"storefront-theme\"",
          "+",
          "@@ -11,0 +14,4 @@ const ThemeContext = createContext<ThemeContextValue | null>(null)",
          "+function readStoredTheme(): Theme {",
          "+  return localStorage.getItem(THEME_STORAGE_KEY) === \"dark\" ? \"dark\" : \"light\"",
          "+}",
          "+",
          "@@ -13 +19,4 @@ export function ThemeProvider({ children }: { children: ReactNode }) {",
          "-  const [theme, setTheme] = useState<Theme>(\"light\")",
          "+  const [theme, setTheme] = useState<Theme>(readStoredTheme)",
          "+  useEffect(() => {",
          "+    localStorage.setItem(THEME_STORAGE_KEY, theme)",
          "+  }, [theme])",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF })

    await expectCaseSnapshot({
      context: [
        "## Summary",
        "",
        "The light or dark theme a visitor picks is still there after a reload. It went back to light before.",
        "",
        "## Changes",
        "",
        "All in `src/components/ThemeProvider.tsx`:",
        "",
        "- The `react` import adds `useEffect`.",
        "- A new module-level constant, `THEME_STORAGE_KEY`, names the entry in `localStorage`.",
        "- A new function, `readStoredTheme`, returns the stored theme, or `light` when none is stored.",
        "- `ThemeProvider` starts its state from `readStoredTheme`, passed to `useState` as a value, and writes the theme to `localStorage` in a new `useEffect` whenever it changes.",
        "",
        "## Reach",
        "",
        "- One file changes in four places: an import, a constant, an added function and a modified component.",
        "- `src/main.tsx` renders `ThemeProvider` around the router, at the top level of the file.",
        "- `useTheme`, in the same file, is not changed. `RootLayout` calls it for `theme` and `toggleTheme`, and gets the stored theme on the first render.",
        "- `RootLayout` wraps every route, so every page starts in the stored theme.",
      ].join("\n"),
      codegraph,
    })
  })

  it("Modified component ProfileForm to reset after a save", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/routes/account/components/ProfileForm.tsx b/src/routes/account/components/ProfileForm.tsx",
          "--- a/src/routes/account/components/ProfileForm.tsx",
          "+++ b/src/routes/account/components/ProfileForm.tsx",
          "@@ -9 +9 @@ export function ProfileForm({ profile }: { profile: Profile }) {",
          "-  const { register, handleSubmit, formState } = useForm<Profile>({",
          "+  const { register, handleSubmit, formState, reset } = useForm<Profile>({",
          "@@ -15 +15 @@ export function ProfileForm({ profile }: { profile: Profile }) {",
          "-    saveProfile(values)",
          "+    saveProfile(values, { onSuccess: (savedProfile) => reset(savedProfile) })",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF })

    await expectCaseSnapshot({
      context: [
        "## Summary",
        "",
        "After a profile is saved, the form takes the saved values as its new starting point, so it no longer counts as edited.",
        "",
        "## Changes",
        "",
        "Both in `src/routes/account/components/ProfileForm.tsx`:",
        "",
        "- `ProfileForm` takes `reset` out of the result of `useForm`, beside `register`, `handleSubmit` and `formState`.",
        "- `onSubmit`, a function declared inside `ProfileForm`, passes a second argument to `saveProfile`: an `onSuccess` callback that calls `reset` with the saved profile.",
        "",
        "## Reach",
        "",
        "- The second change is inside a function that is inside a component: `onSubmit` is the nearest declaration around it, and `ProfileForm` the outermost.",
        "- `onSubmit` is never called by name. It is handed to `handleSubmit` as a value, in the `onSubmit` property of the form element.",
        "- `saveProfile` is the `mutate` function of `useUpdateProfile`, which is not changed.",
        "- `AccountPage` renders `ProfileForm`, so only the account route is reached.",
      ].join("\n"),
      codegraph,
    })
  })

  it("Modified function request to send the session token", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/api/client.ts b/src/api/client.ts",
          "--- a/src/api/client.ts",
          "+++ b/src/api/client.ts",
          "@@ -1,0 +2 @@ const API_URL = \"/api\"",
          "+const SESSION_TOKEN_KEY = \"storefront-session\"",
          "@@ -17,0 +19,4 @@ async function readError(response: Response): Promise<ApiError> {",
          "+function readSessionToken(): string | null {",
          "+  return sessionStorage.getItem(SESSION_TOKEN_KEY)",
          "+}",
          "+",
          "@@ -18,0 +24 @@ export async function request<T>(path: string, init?: RequestInit): Promise<T> {",
          "+  const token = readSessionToken()",
          "@@ -21 +27,5 @@ export async function request<T>(path: string, init?: RequestInit): Promise<T> {",
          "-    headers: { \"Content-Type\": \"application/json\", ...init?.headers },",
          "+    headers: {",
          "+      \"Content-Type\": \"application/json\",",
          "+      ...(token === null ? {} : { Authorization: `Bearer ${token}` }),",
          "+      ...init?.headers,",
          "+    },",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF })

    await expectCaseSnapshot({
      context: [
        "## Summary",
        "",
        "Every call to the API carries the visitor's session token, when there is one.",
        "",
        "## Changes",
        "",
        "All in `src/api/client.ts`:",
        "",
        "- A new module-level constant, `SESSION_TOKEN_KEY`, names the entry in `sessionStorage`.",
        "- A new function, `readSessionToken`, returns the stored token or `null`. It is not exported.",
        "- `request` calls `readSessionToken` and adds an `Authorization: Bearer` header when a token is there. The `headers` object, written on one line before, is spread over several.",
        "",
        "## Reach",
        "",
        "- `request` is at the bottom of the stack: every call to the API goes through it.",
        "- `fetchProducts` in `src/api/products.ts` calls it. That function is handed to `useProducts` as a query function, and `CatalogPage` uses that hook.",
        "- `fetchProfile` and `updateProfile` in `src/api/profile.ts` call it. They are handed to `useProfile` and `useUpdateProfile`, used by `AccountPage` and `ProfileForm`.",
        "- So one change in one file reaches two features that otherwise share nothing: the catalogue and the account.",
        "- `readError` and `ApiError`, in the same file, are not changed. The cart makes no request and is not reached.",
      ].join("\n"),
      codegraph,
    })
  })

  it("Modified hook useUpdateProfile to refetch the profile after a save", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/hooks/use-profile.ts b/src/hooks/use-profile.ts",
          "--- a/src/hooks/use-profile.ts",
          "+++ b/src/hooks/use-profile.ts",
          "@@ -14,2 +14,2 @@ export function useUpdateProfile() {",
          "-    onSuccess: (profile) => {",
          "-      queryClient.setQueryData(PROFILE_QUERY_KEY, profile)",
          "+    onSuccess: () => {",
          "+      void queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY })",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF })

    await expectCaseSnapshot({
      context: [
        "## Summary",
        "",
        "After a profile is saved, the app loads it again from the API. It wrote the response of the save into its cache before.",
        "",
        "## Changes",
        "",
        "- In `useUpdateProfile` in `src/hooks/use-profile.ts`, the `onSuccess` callback of the mutation calls `queryClient.invalidateQueries` with `PROFILE_QUERY_KEY`. It called `queryClient.setQueryData` with the saved profile before, and no longer takes the profile as a parameter.",
        "- The change is inside an arrow function that is a property of the object handed to `useMutation`, inside `useUpdateProfile`.",
        "",
        "## Reach",
        "",
        "- `ProfileForm` calls `useUpdateProfile` and uses its `mutate` function to save.",
        "- `useProfile`, in the same file, is not changed, but its query is the one invalidated: `PROFILE_QUERY_KEY` links the two hooks. `AccountPage` calls `useProfile` and renders again when the profile is loaded.",
        "- `updateProfile`, the mutation function, is not changed.",
        "- Only the account route is reached.",
      ].join("\n"),
      codegraph,
    })
  })

  it("Modified route account to load its page lazily", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/router.tsx b/src/router.tsx",
          "--- a/src/router.tsx",
          "+++ b/src/router.tsx",
          "@@ -2 +1,0 @@ import { createBrowserRouter } from \"react-router\"",
          "-import { AccountPage } from \"@/routes/account\"",
          "@@ -14 +13 @@ export const router = createBrowserRouter([",
          "-      { path: \"account\", element: <AccountPage /> },",
          "+      { path: \"account\", lazy: async () => ({ Component: (await import(\"@/routes/account\")).AccountPage }) },",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF })

    await expectCaseSnapshot({
      context: [
        "## Summary",
        "",
        "The code of the account page is downloaded when a visitor first opens `/account`, not with the rest of the app.",
        "",
        "## Changes",
        "",
        "Both in `src/router.tsx`:",
        "",
        "- The static import of `AccountPage` from `@/routes/account` is removed.",
        "- The `account` route replaces `element: <AccountPage />` with a `lazy` function that loads `@/routes/account` with a dynamic `import()` and returns `AccountPage` as the route's `Component`.",
        "",
        "## Reach",
        "",
        "- The change is inside `router`, a module-level value built by `createBrowserRouter(...)`, which `src/main.tsx` hands to `RouterProvider`.",
        "- `router.tsx` no longer has a static import of the account page. The only link left between them is the dynamic `import()`.",
        "- No file of the account feature is changed: `AccountPage`, `ProfileForm`, the profile hooks and the profile API are as they were.",
        "- The catalogue and cart routes keep their static imports and are not changed.",
      ].join("\n"),
      codegraph,
    })
  })

  it("Implement feature Promo codes", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/api/promo.ts b/src/api/promo.ts",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/api/promo.ts",
          "@@ -0,0 +1,10 @@",
          "+import { request } from \"@/api/client\"",
          "+",
          "+export interface Promo {",
          "+  code: string",
          "+  percentOff: number",
          "+}",
          "+",
          "+export function fetchPromo(code: string): Promise<Promo> {",
          "+  return request<Promo>(`/promos/${encodeURIComponent(code)}`)",
          "+}",
        ].join("\n"),
        [
          "diff --git a/src/hooks/use-promo.ts b/src/hooks/use-promo.ts",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/hooks/use-promo.ts",
          "@@ -0,0 +1,8 @@",
          "+import { useMutation } from \"@tanstack/react-query\"",
          "+import { fetchPromo } from \"@/api/promo\"",
          "+import { useCartStore } from \"@/stores/cart-store\"",
          "+",
          "+export function useApplyPromo() {",
          "+  const applyPromo = useCartStore((state) => state.applyPromo)",
          "+  return useMutation({ mutationFn: fetchPromo, onSuccess: applyPromo })",
          "+}",
        ].join("\n"),
        [
          "diff --git a/src/routes/cart/components/CartSummary.tsx b/src/routes/cart/components/CartSummary.tsx",
          "--- a/src/routes/cart/components/CartSummary.tsx",
          "+++ b/src/routes/cart/components/CartSummary.tsx",
          "@@ -4 +4,2 @@ import { formatPrice } from \"@/lib/format\"",
          "-import { selectTotalCents, useCartStore } from \"@/stores/cart-store\"",
          "+import { selectDiscountCents, selectTotalCents, useCartStore } from \"@/stores/cart-store\"",
          "+import { PromoForm } from \"./PromoForm\"",
          "@@ -7,0 +9 @@ export function CartSummary() {",
          "+  const discountCents = useCartStore(selectDiscountCents)",
          "@@ -18 +20,3 @@ export function CartSummary() {",
          "-      <p>Total: {formatPrice(totalCents)}</p>",
          "+      <PromoForm />",
          "+      {discountCents > 0 && <p>Discount: {formatPrice(discountCents)}</p>}",
          "+      <p>Total: {formatPrice(totalCents - discountCents)}</p>",
        ].join("\n"),
        [
          "diff --git a/src/routes/cart/components/PromoForm.tsx b/src/routes/cart/components/PromoForm.tsx",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/routes/cart/components/PromoForm.tsx",
          "@@ -0,0 +1,23 @@",
          "+import { useState, type FormEvent } from \"react\"",
          "+import { Button, Input } from \"@/components/ui\"",
          "+import { useApplyPromo } from \"@/hooks/use-promo\"",
          "+",
          "+export function PromoForm() {",
          "+  const [code, setCode] = useState(\"\")",
          "+  const { mutate: applyPromo, isPending, isError } = useApplyPromo()",
          "+",
          "+  function handleSubmit(event: FormEvent<HTMLFormElement>) {",
          "+    event.preventDefault()",
          "+    applyPromo(code)",
          "+  }",
          "+",
          "+  return (",
          "+    <form onSubmit={handleSubmit}>",
          "+      <Input aria-label=\"Promo code\" value={code} onChange={(event) => setCode(event.target.value)} />",
          "+      <Button type=\"submit\" disabled={isPending}>",
          "+        Apply",
          "+      </Button>",
          "+      {isError && <p>That code is not valid.</p>}",
          "+    </form>",
          "+  )",
          "+}",
        ].join("\n"),
        [
          "diff --git a/src/stores/cart-store.ts b/src/stores/cart-store.ts",
          "--- a/src/stores/cart-store.ts",
          "+++ b/src/stores/cart-store.ts",
          "@@ -1,0 +2 @@ import { create } from \"zustand\"",
          "+import type { Promo } from \"@/api/promo\"",
          "@@ -5,0 +7 @@ interface CartState {",
          "+  promo: Promo | null",
          "@@ -7,0 +10 @@ interface CartState {",
          "+  applyPromo: (promo: Promo) => void",
          "@@ -12,0 +16 @@ export const useCartStore = create<CartState>((set) => ({",
          "+  promo: null,",
          "@@ -18,0 +23,3 @@ export const useCartStore = create<CartState>((set) => ({",
          "+  applyPromo: (promo) => {",
          "+    set({ promo })",
          "+  },",
          "@@ -20 +27 @@ export const useCartStore = create<CartState>((set) => ({",
          "-    set({ items: [] })",
          "+    set({ items: [], promo: null })",
          "@@ -30,0 +38,7 @@ export function selectTotalCents(state: CartState): number {",
          "+",
          "+const PERCENT = 100",
          "+",
          "+export function selectDiscountCents(state: CartState): number {",
          "+  if (state.promo === null) return 0",
          "+  return Math.round((selectTotalCents(state) * state.promo.percentOff) / PERCENT)",
          "+}",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF })

    await expectCaseSnapshot({
      context: [
        "## Summary",
        "",
        "A shopper can enter a promo code in the cart. A valid code takes a percentage off the total, and the cart shows the discount.",
        "",
        "## Changes",
        "",
        "Three new files, one per layer:",
        "",
        "- `src/api/promo.ts` holds the type `Promo` and `fetchPromo`, which asks the API for the promo of a code.",
        "- `src/hooks/use-promo.ts` holds `useApplyPromo`, a mutation that calls `fetchPromo` and, on success, hands the promo to the store's `applyPromo` action.",
        "- `src/routes/cart/components/PromoForm.tsx` holds `PromoForm`, a form with one input, a submit button and an error message.",
        "",
        "Two modified files:",
        "",
        "- `src/stores/cart-store.ts`: `CartState` gains `promo` and `applyPromo`. `useCartStore` starts with `promo: null`, gains the `applyPromo` action, and its `clear` action now clears the promo too. A new constant, `PERCENT`, and a new selector, `selectDiscountCents`, are added at the end of the file. The selector calls `selectTotalCents`.",
        "- `CartSummary` imports `selectDiscountCents` and `PromoForm`, reads the discount from the store, renders `PromoForm`, shows a discount line when there is one, and shows the total minus the discount.",
        "",
        "## Reach",
        "",
        "- This is a feature through every layer: API, hook, store, component. Five files, three of them new.",
        "- `fetchPromo` is handed to `useMutation` as a value, and `applyPromo` is handed to it as the `onSuccess` callback. Neither is called by name.",
        "- `PromoForm` writes the store through `useApplyPromo`, and `CartSummary` reads it through `selectDiscountCents`. `CartSummary` also renders `PromoForm`.",
        "- `useCartStore` is modified, so its other readers are in reach: `CartPage`, `CartLine`, `CartBadge` and `AddToCartButton`. What they read, `items`, `addItem` and `removeItem`, is not changed.",
        "- `fetchPromo` calls `request` in `src/api/client.ts`, which is not changed.",
        "- `CartPage` renders `CartSummary`, so the cart route is where the feature shows. The account route is not reached.",
      ].join("\n"),
      codegraph,
    })
  })

  it("Modified import Button in AddToCartButton to skip the barrel", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/routes/catalog/components/AddToCartButton.tsx b/src/routes/catalog/components/AddToCartButton.tsx",
          "--- a/src/routes/catalog/components/AddToCartButton.tsx",
          "+++ b/src/routes/catalog/components/AddToCartButton.tsx",
          "@@ -1 +1 @@",
          "-import { Button } from \"@/components/ui\"",
          "+import { Button } from \"@/components/ui/button\"",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF })

    await expectCaseSnapshot({
      context: [
        "## Summary",
        "",
        "`AddToCartButton` imports the shared button from its own file instead of through the barrel. Nothing behaves differently.",
        "",
        "## Changes",
        "",
        "- In `src/routes/catalog/components/AddToCartButton.tsx`, the import of `Button` reads `@/components/ui/button`. It read `@/components/ui` before. One import line changes.",
        "",
        "## Reach",
        "",
        "- Only an import statement changes. It is outside every function: the component `AddToCartButton` below it is not touched.",
        "- The file stops importing the barrel `src/components/ui/index.ts` and starts importing `src/components/ui/button.tsx` directly. It still uses the same `Button`.",
        "- `Button` and the barrel are not changed. The other users of `Button` still go through the barrel.",
        "- `ProductCard` renders `AddToCartButton`, in the catalogue.",
      ].join("\n"),
      codegraph,
    })
  })
})
