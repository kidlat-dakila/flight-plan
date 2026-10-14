import { useQuery } from "@tanstack/vue-query"
import { fetchCustomers } from "@/api/customers"

const CUSTOMERS_QUERY_KEY = ["customers"] as const

export const useCustomers = () => {
  return useQuery({ queryKey: CUSTOMERS_QUERY_KEY, queryFn: fetchCustomers })
}
