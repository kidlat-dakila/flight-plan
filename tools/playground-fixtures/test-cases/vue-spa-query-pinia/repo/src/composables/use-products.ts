import { useQuery } from "@tanstack/vue-query"
import { fetchProducts } from "@/api/products"

export const useProducts = () => {
  return useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  })
}
