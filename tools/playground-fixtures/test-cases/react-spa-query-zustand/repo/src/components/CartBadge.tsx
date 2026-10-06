import { Link } from "react-router"
import { selectItemCount, useCartStore } from "@/stores/cart-store"

export function CartBadge() {
  const itemCount = useCartStore(selectItemCount)
  return <Link to="/cart">Cart ({itemCount})</Link>
}
