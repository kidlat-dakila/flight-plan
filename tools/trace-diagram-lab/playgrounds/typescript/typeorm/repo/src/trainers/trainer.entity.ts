import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm"
import { Pokemon } from "@/pokemon/pokemon.entity"

@Entity("trainers")
export class Trainer {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ length: 40 })
  name!: string

  @Column({ length: 40 })
  hometown!: string

  @OneToMany(() => Pokemon, (pokemon) => pokemon.trainer)
  team!: Pokemon[]
}
