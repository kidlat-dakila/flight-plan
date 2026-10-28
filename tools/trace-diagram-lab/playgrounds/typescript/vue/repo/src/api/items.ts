import { request } from "@/api/client"
import type { Item } from "@/types/item"

export const fetchItems = (): Promise<Item[]> => request<Item[]>("/items")
