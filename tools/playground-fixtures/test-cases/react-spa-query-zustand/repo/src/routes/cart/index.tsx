import { useCartStore } from "@/stores/cart-store"
import { CartLine } from "./components/CartLine"
import { CartSummary } from "./components/CartSummary"

export function CartPage() {
  const items = useCartStore((state) => state.items)
  if (items.length === 0) return <p>Your cart is empty.</p>
  return (
    <section>
      <ul>
        {items.map((item) => (
          <CartLine key={item.product.id} item={item} />
        ))}
      </ul>
      <CartSummary />
    </section>
  )
}
