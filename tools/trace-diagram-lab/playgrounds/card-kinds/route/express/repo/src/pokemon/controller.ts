import type { Request, Response } from "express"
import { readParty } from "@/pokemon/store"

export const listPokemon = (_req: Request, res: Response) => {
  res.json(readParty())
}
