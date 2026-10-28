import { useItems } from "@/hooks/use-items"

export function ItemsPage() {
  const { data: items = [] } = useItems()
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>
          {item.name} ₽{item.price}
        </li>
      ))}
    </ul>
  )
}
