import { useQuery } from "@tanstack/vue-query"
import { fetchItems } from "@/api/items"

const ITEMS_QUERY_KEY = ["items"] as const

export const useItems = () => {
  return useQuery({ queryKey: ITEMS_QUERY_KEY, queryFn: fetchItems })
}
