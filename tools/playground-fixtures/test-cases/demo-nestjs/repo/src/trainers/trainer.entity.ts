import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"

@Entity("trainers")
export class Trainer {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ length: 40 })
  name!: string

  @Column({ length: 40 })
  hometown!: string
}
