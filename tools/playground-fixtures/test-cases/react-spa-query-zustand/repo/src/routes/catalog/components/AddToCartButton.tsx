import { Button } from "@/components/ui"
import { useCartStore } from "@/stores/cart-store"
import type { Product } from "@/types/product"

export function AddToCartButton({ product }: { product: Product }) {
  const addItem = useCartStore((state) => state.addItem)
  return <Button onClick={() => addItem(product)}>Add to cart</Button>
}
