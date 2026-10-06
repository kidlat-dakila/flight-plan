import { formatPrice } from "@/lib/format"
import type { Product } from "@/types/product"
import { AddToCartButton } from "./AddToCartButton"

export function ProductCard({ product }: { product: Product }) {
  return (
    <article>
      <img src={product.imageUrl} alt={product.name} />
      <h2>{product.name}</h2>
      <p>{formatPrice(product.priceCents)}</p>
      <AddToCartButton product={product} />
    </article>
  )
}
