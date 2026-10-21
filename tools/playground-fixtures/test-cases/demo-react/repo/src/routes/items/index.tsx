import { useItems } from "@/hooks/use-items"
import { formatPrice } from "@/lib/format"

export function ItemsPage() {
  const { data: items, isPending, isError } = useItems()
  if (isPending) return <p>Loading the items…</p>
  if (isError) return <p>The items could not be loaded.</p>
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>
          {item.name} {formatPrice(item.price)}
        </li>
      ))}
    </ul>
  )
}
