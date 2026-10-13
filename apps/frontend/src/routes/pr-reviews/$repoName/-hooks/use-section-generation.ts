import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTRPC } from "@/trpc"

type GeneratedSection = "journey" | "blast" | "findings"

interface ReviewKey {
  readonly repositoryName: string
  readonly targetId: string
}

export interface SectionGeneration {
  readonly generatingSection: string | null
  readonly errorMessageOf: (section: string) => string | null
  readonly onGenerate: (section: GeneratedSection) => void
}

export const useSectionGeneration = (reviewKey: ReviewKey, onGenerated: (message: string) => void): SectionGeneration => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const generateSection = useMutation(
    trpc.review.generateSection.mutationOptions({
      onSuccess: async (result) => {
        if (result.kind !== "generated") return
        if (result.prompt !== null) await navigator.clipboard.writeText(result.prompt).catch(() => undefined)
        await queryClient.invalidateQueries(trpc.review.get.pathFilter())
        onGenerated(result.message)
      },
    }),
  )
  const problem = generateSection.data?.kind === "unavailable" ? generateSection.data.message : generateSection.error?.message ?? null

  return {
    generatingSection: generateSection.isPending ? generateSection.variables.section : null,
    errorMessageOf: (section) => (generateSection.variables?.section === section ? problem : null),
    onGenerate: (section) => { generateSection.mutate({ ...reviewKey, section }) },
  }
}
