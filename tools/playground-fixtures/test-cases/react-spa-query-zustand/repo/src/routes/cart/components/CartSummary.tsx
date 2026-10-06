import { useState } from "react"
import { Button, Dialog } from "@/components/ui"
import { formatPrice } from "@/lib/format"
import { selectTotalCents, useCartStore } from "@/stores/cart-store"

export function CartSummary() {
  const totalCents = useCartStore(selectTotalCents)
  const clear = useCartStore((state) => state.clear)
  const [isConfirming, setIsConfirming] = useState(false)

  function handleConfirm() {
    clear()
    setIsConfirming(false)
  }

  return (
    <footer>
      <p>Total: {formatPrice(totalCents)}</p>
      <Button variant="ghost" onClick={() => setIsConfirming(true)}>
        Empty the cart
      </Button>
      <Dialog title="Empty the cart?" open={isConfirming} onClose={() => setIsConfirming(false)}>
        <Button onClick={handleConfirm}>Empty it</Button>
      </Dialog>
    </footer>
  )
}
