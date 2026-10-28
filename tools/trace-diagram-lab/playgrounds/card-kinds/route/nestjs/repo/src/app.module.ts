import { Module } from "@nestjs/common"
import { HealthModule } from "@/health/health.module"
import { PokemonModule } from "@/pokemon/pokemon.module"

@Module({
  imports: [HealthModule, PokemonModule],
})
export class AppModule {}
