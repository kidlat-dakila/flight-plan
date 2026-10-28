import { useEffect, useState } from "react"
import { fetchItems } from "@/api/items"
import type { Item } from "@/types/item"

export function ItemsPage() {
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    fetchItems().then(setItems)
  }, [])

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
