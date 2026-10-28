import { fetchItems } from "@/api/items"

export async function itemsLoader() {
  return await fetchItems()
}
