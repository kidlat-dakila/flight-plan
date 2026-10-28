import { useLoaderData } from "react-router"
import type { itemsLoader } from "./loader"

export function ItemsPage() {
  const items = useLoaderData<typeof itemsLoader>()
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
