import type { CreationForm } from "./schemas"

export const buildCreationForm = (repositoryName: string): CreationForm => ({
  title: "Create a Flight Plan",
  description: `For a pull request or a branch of ${repositoryName}.`,
  target: {
    label: "Pull request or branch",
    hint: "Your open pull requests come first, then the two branches with the latest commits.",
    placeholder: "Search by title, number or branch",
  },
})
