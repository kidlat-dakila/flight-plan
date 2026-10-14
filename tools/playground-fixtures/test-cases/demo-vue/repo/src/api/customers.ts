import { request } from "@/api/client"
import type { Customer } from "@/types/customer"

export const fetchCustomers = (): Promise<Customer[]> => request<Customer[]>("/customers")
