import { useQuery } from "@tanstack/vue-query"
import { fetchTrainers } from "@/api/trainers"

const TRAINERS_QUERY_KEY = ["trainers"] as const

export const useTrainers = () => {
  return useQuery({ queryKey: TRAINERS_QUERY_KEY, queryFn: fetchTrainers })
}
