import { useQuery } from "@tanstack/react-query"
import { fetchTrainers } from "@/api/trainers"

export const TRAINERS_QUERY_KEY = ["trainers"] as const

export function useTrainers() {
  return useQuery({ queryKey: TRAINERS_QUERY_KEY, queryFn: fetchTrainers })
}
