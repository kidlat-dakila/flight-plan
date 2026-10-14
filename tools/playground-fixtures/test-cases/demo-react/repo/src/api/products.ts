import { request } from "@/api/client"
import type { Product } from "@/types/product"

export function fetchProducts(): Promise<Product[]> {
  return request<Product[]>("/products")
}
