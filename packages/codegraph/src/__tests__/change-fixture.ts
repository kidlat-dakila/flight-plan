import type { FakeChange } from "@/import-graph/__tests__/fake-git-adapter"

const fileOf = (...lines: readonly string[]): string => lines.join("\n")

const TYPES = ["export interface Item {", "  price: number", "}"]
const PRICING = ["import type { Item } from \"./types\"", "", "export function priceOf(item: Item) {", "  return item.price", "}"]
const CART = ["import { priceOf } from \"./pricing\"", "", "export class Cart {", "  subtotal(items) {", "    return items.map(priceOf)", "  }", "}"]
const UI = ["import { Cart } from \"./cart\"", "", "export function CheckoutButton(items) {", "  return new Cart().subtotal(items)", "}"]
const LOGGER = ["export const log = (message) => {", "  console.log(message)", "}"]

export const STOREFRONT_CHANGE: FakeChange = {
  base: {
    "src/types.ts": fileOf(...TYPES),
    "src/pricing.ts": fileOf(...PRICING),
    "src/cart.ts": fileOf(...CART),
    "src/ui.ts": fileOf(...UI),
    "src/logger.ts": fileOf(...LOGGER),
    "README.md": "# Storefront",
  },
  head: {
    "src/types.ts": fileOf("export interface Item {", "  price: number", "  onSale: boolean", "}"),
    "src/pricing.ts": fileOf(
      "import type { Item } from \"./types\"",
      "",
      "export function priceOf(item: Item) {",
      "  return item.onSale ? item.price * 0.9 : item.price",
      "}",
    ),
    "src/cart.ts": fileOf(...CART),
    "src/ui.ts": fileOf(...UI),
    "src/logger.ts": fileOf("export const log = (message) => {", "  console.info(message)", "}"),
    "README.md": "# Storefront\n\nNow with sales.",
  },
}
