import { useProducts } from "@/hooks/use-products"
import { formatPrice } from "@/lib/format"

export function ProductsPage() {
  const { data: products, isPending, isError } = useProducts()
  if (isPending) return <p>Loading the products…</p>
  if (isError) return <p>The products could not be loaded.</p>
  return (
    <ul>
      {products.map((product) => (
        <li key={product.id}>
          {product.name} {formatPrice(product.priceCents)}
        </li>
      ))}
    </ul>
  )
}
