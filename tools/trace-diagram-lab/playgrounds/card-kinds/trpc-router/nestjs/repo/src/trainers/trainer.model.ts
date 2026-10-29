import { Field, Int, ObjectType } from "@nestjs/graphql"

@ObjectType()
export class Trainer {
  @Field(() => Int)
  id!: number

  @Field()
  name!: string

  @Field()
  hometown!: string

  @Field(() => [String])
  badges!: string[]
}
