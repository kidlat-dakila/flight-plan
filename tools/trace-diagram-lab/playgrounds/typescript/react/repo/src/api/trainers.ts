import { request } from "@/api/client"
import type { Trainer } from "@/types/trainer"

export function fetchTrainers(): Promise<Trainer[]> {
  return request<Trainer[]>("/trainers")
}
