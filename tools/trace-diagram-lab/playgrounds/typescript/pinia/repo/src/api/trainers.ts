import { request } from "@/api/client"
import type { Trainer } from "@/types/trainer"

export const fetchTrainers = (): Promise<Trainer[]> => request<Trainer[]>("/trainers")
