import { useQuery } from "@tanstack/react-query"
import { fetchItems } from "@/api/items"

const ITEMS_QUERY_KEY = ["items"] as const

export function useItems() {
  return useQuery({ queryKey: ITEMS_QUERY_KEY, queryFn: fetchItems })
}
