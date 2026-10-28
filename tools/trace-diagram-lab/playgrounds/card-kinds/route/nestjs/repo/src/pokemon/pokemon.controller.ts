import { Controller, Get, Param, ParseIntPipe, UseGuards } from "@nestjs/common"
import { ApiKeyGuard } from "@/security"
import { PokemonService } from "@/pokemon/pokemon.service"

@Controller("pokemon")
@UseGuards(ApiKeyGuard)
export class PokemonController {
  constructor(private readonly pokemon: PokemonService) {}

  @Get()
  readAll() {
    return this.pokemon.list()
  }

  @Get(":pokemonId")
  read(@Param("pokemonId", ParseIntPipe) pokemonId: number) {
    return this.pokemon.find(pokemonId)
  }
}
