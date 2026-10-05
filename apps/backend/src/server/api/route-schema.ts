import { z } from "zod"

const JSON_SCHEMA_TARGET = "draft-7"

export const toRouteSchema = (schema: z.ZodType): Readonly<Record<string, unknown>> =>
  z.toJSONSchema(schema, { target: JSON_SCHEMA_TARGET })
