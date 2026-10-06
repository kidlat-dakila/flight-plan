import { z } from "zod"

const NAME_MIN_LENGTH = 2

export const profileSchema = z.object({
  name: z.string().min(NAME_MIN_LENGTH),
  email: z.string().email(),
})

export type Profile = z.infer<typeof profileSchema>
