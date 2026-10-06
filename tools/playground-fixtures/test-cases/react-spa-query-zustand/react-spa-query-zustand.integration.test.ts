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

    await expectCaseSnapshot(codegraph)
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

    await expectCaseSnapshot(codegraph)
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

    await expectCaseSnapshot(codegraph)
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

    await expectCaseSnapshot(codegraph)
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

    await expectCaseSnapshot(codegraph)
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

    await expectCaseSnapshot(codegraph)
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

    await expectCaseSnapshot(codegraph)
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

    await expectCaseSnapshot(codegraph)
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

    await expectCaseSnapshot(codegraph)
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

    await expectCaseSnapshot(codegraph)
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

    await expectCaseSnapshot(codegraph)
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

    await expectCaseSnapshot(codegraph)
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

    await expectCaseSnapshot(codegraph)
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

    await expectCaseSnapshot(codegraph)
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

    await expectCaseSnapshot(codegraph)
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

    await expectCaseSnapshot(codegraph)
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

    await expectCaseSnapshot(codegraph)
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

    await expectCaseSnapshot(codegraph)
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

    await expectCaseSnapshot(codegraph)
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

    await expectCaseSnapshot(codegraph)
  })
})
