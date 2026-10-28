import { ApolloDriver, type ApolloDriverConfig } from "@nestjs/apollo"
import { Module } from "@nestjs/common"
import { GraphQLModule } from "@nestjs/graphql"
import { TrainersModule } from "@/trainers/trainers.module"

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({ driver: ApolloDriver, autoSchemaFile: true, subscriptions: { "graphql-ws": true } }),
    TrainersModule,
  ],
})
export class AppModule {}
