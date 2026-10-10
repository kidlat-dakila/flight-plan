import { request } from "@/api/client"
import type { Product } from "@/types/product"

export const fetchProducts = async (): Promise<Product[]> => {
  return await request<Product[]>("/products")
}
