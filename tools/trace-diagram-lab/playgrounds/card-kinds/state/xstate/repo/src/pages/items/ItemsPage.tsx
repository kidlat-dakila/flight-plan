import { ITEMS } from "@/data/items"

export function ItemsPage() {
  return (
    <ul>
      {ITEMS.map((item) => (
        <li key={item.id}>
          {item.name} ₽{item.price}
        </li>
      ))}
    </ul>
  )
}
