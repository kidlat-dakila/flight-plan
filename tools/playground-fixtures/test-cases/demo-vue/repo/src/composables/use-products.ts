import { useQuery } from "@tanstack/vue-query"
import { fetchProducts } from "@/api/products"

const PRODUCTS_QUERY_KEY = ["products"] as const

export const useProducts = () => {
  return useQuery({ queryKey: PRODUCTS_QUERY_KEY, queryFn: fetchProducts })
}
