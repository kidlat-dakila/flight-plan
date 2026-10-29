import { Injectable, NotFoundException } from "@nestjs/common"
import type { CreatePokemonDto } from "@/pokemon/pokemon.dto"
import type { Pokemon } from "@/pokemon/pokemon"

@Injectable()
export class PokemonService {
  private readonly party = new Map<number, Pokemon>([
    [1, { id: 1, name: "Pikachu", level: 12, trainerName: "Ash" }],
    [2, { id: 2, name: "Staryu", level: 9, trainerName: "Misty" }],
  ])

  list(): Pokemon[] {
    return [...this.party.values()]
  }

  find(pokemonId: number): Pokemon {
    const pokemon = this.party.get(pokemonId)
    if (pokemon === undefined) throw new NotFoundException(`Pokemon ${pokemonId} not found`)
    return pokemon
  }

  create(draft: CreatePokemonDto, trainerName: string): Pokemon {
    const pokemon: Pokemon = { id: this.party.size + 1, name: draft.name, level: draft.level, trainerName }
    this.party.set(pokemon.id, pokemon)
    return pokemon
  }
}
