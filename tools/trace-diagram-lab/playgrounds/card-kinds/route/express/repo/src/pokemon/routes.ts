import { Router } from "express"
import { listPokemon } from "@/pokemon/controller"
import { readPokemon } from "@/pokemon/store"

export const pokemonRouter = Router()

pokemonRouter.get("/pokemon", listPokemon)

pokemonRouter.get("/pokemon/:pokemonId", (req, res) => {
  res.json(readPokemon(Number(req.params.pokemonId)))
})
