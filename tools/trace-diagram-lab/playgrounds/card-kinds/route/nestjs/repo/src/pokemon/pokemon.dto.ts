import { IsInt, IsString, Length, Max, Min } from "class-validator"

export class CreatePokemonDto {
  @IsString()
  @Length(1, 20)
  name!: string

  @IsInt()
  @Min(1)
  @Max(100)
  level!: number
}
