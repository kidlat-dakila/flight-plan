import { IsString, Length } from "class-validator"

export class CreateTrainerDto {
  @IsString()
  @Length(1, 40)
  name!: string

  @IsString()
  @Length(1, 40)
  hometown!: string
}
