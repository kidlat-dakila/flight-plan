import { z } from "zod"

export const getCreationFormInputSchema = z.strictObject({
  repositoryName: z.string(),
})

export const creationFormSchema = z.strictObject({
  title: z.string(),
  description: z.string(),
  target: z.strictObject({
    label: z.string(),
    hint: z.string(),
    placeholder: z.string(),
  }),
})

export type GetCreationFormInput = z.infer<typeof getCreationFormInputSchema>
export type CreationForm = z.infer<typeof creationFormSchema>
