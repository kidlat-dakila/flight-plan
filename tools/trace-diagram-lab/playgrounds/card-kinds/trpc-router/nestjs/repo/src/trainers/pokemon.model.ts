import { Field, Int, ObjectType } from "@nestjs/graphql"

@ObjectType()
export class Pokemon {
  @Field()
  name!: string

  @Field(() => Int)
  level!: number
}
