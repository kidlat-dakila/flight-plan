import type { Setup } from "@/procedures/get-setup/utils/setup"

export const withoutRepository = (setup: Setup, name: string): Setup | null =>
  setup.repositories.some((repository) => repository.name === name)
    ? { ...setup, repositories: setup.repositories.filter((repository) => repository.name !== name) }
    : null
