import { Button } from "@/components/ui"
import { formatPrice, formatQuantity } from "@/lib/format"
import { useCartStore } from "@/stores/cart-store"
import type { CartItem } from "@/types/product"

export function CartLine({ item }: { item: CartItem }) {
  const removeItem = useCartStore((state) => state.removeItem)
  return (
    <li>
      <span>{item.product.name}</span>
      <span>{formatQuantity(item.quantity)}</span>
      <span>{formatPrice(item.product.priceCents * item.quantity)}</span>
      <Button variant="ghost" onClick={() => removeItem(item.product.id)}>
        Remove
      </Button>
    </li>
  )
}
