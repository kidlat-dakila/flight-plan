import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm"
import { Trainer } from "@/trainers/trainer.entity"

@Entity("pokemon")
export class Pokemon {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ length: 40 })
  species!: string

  @Column({ default: 5 })
  level!: number

  @ManyToOne(() => Trainer, (trainer) => trainer.team, { onDelete: "CASCADE" })
  trainer!: Trainer
}
