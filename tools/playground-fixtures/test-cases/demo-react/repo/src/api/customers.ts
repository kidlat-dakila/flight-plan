import { request } from "@/api/client"
import type { Customer } from "@/types/customer"

export function fetchCustomers(): Promise<Customer[]> {
  return request<Customer[]>("/customers")
}
