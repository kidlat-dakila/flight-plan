import { useQuery } from "@tanstack/react-query"
import { fetchCustomers } from "@/api/customers"

const CUSTOMERS_QUERY_KEY = ["customers"] as const

export function useCustomers() {
  return useQuery({ queryKey: CUSTOMERS_QUERY_KEY, queryFn: fetchCustomers })
}
