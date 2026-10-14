import { request } from "@/api/client"
import type { Product } from "@/types/product"

export const fetchProducts = (): Promise<Product[]> => request<Product[]>("/products")
