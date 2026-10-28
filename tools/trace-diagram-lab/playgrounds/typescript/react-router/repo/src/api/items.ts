import { request } from "@/api/client"
import type { Item } from "@/types/item"

export function fetchItems(): Promise<Item[]> {
  return request<Item[]>("/items")
}
