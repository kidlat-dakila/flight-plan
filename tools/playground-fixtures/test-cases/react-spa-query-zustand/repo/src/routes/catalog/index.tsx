import { useProducts } from "@/hooks/use-products"
import { ProductCard } from "./components/ProductCard"

export function CatalogPage() {
  const { data: products, isPending, isError } = useProducts()
  if (isPending) return <p>Loading the catalogue…</p>
  if (isError) return <p>The catalogue could not be loaded.</p>
  return (
    <ul>
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  )
}
