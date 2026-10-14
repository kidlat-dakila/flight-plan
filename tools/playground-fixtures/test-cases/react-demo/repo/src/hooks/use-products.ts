import { useQuery } from "@tanstack/react-query"
import { fetchProducts } from "@/api/products"

const PRODUCTS_QUERY_KEY = ["products"] as const

export function useProducts() {
  return useQuery({ queryKey: PRODUCTS_QUERY_KEY, queryFn: fetchProducts })
}
