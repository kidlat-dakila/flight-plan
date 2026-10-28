import { join } from "node:path"
import { buildBranchCodegraph } from "@flightplan/codegraph"
import { assembleGitAdapter, type GitAdapter } from "@flightplan/git-forge"
import { CASE_REF, setupTest } from "@flightplan/playground-fixtures/test-setup"
import { expectTraceSnapshot } from "@test-setup/trace-snapshot"

const REPO_PATH = join(import.meta.dirname, "repo")

const openRepository = async (root: string): Promise<GitAdapter> => {
  const resolved = await assembleGitAdapter({ id: "git", root, secret: null, username: "", baseUrl: "" })
  if (!resolved.ok) throw resolved.error
  return resolved.gitAdapter
}

describe("card-kinds/component/react", () => {
  it("Implement page TeamPage", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/api/teams.ts b/src/api/teams.ts",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/api/teams.ts",
          "@@ -0,0 +1,4 @@",
          "+export async function publishTeam(trainerId: number): Promise<void> {",
          "+  const response = await fetch(`/api/trainers/${trainerId}/team/publish`, { method: \"POST\" })",
          "+  if (!response.ok) throw new Error(`Publishing the team failed with ${response.status}.`)",
          "+}",
        ].join("\n"),
        [
          "diff --git a/src/hooks/use-trainer.ts b/src/hooks/use-trainer.ts",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/hooks/use-trainer.ts",
          "@@ -0,0 +1,13 @@",
          "+import { useEffect, useState } from \"react\"",
          "+import { request } from \"@/api/client\"",
          "+import type { Trainer } from \"@/types/trainer\"",
          "+",
          "+export function useTrainer(trainerId: number) {",
          "+  const [trainer, setTrainer] = useState<Trainer | null>(null)",
          "+",
          "+  useEffect(() => {",
          "+    request<Trainer>(`/trainers/${trainerId}`).then(setTrainer)",
          "+  }, [trainerId])",
          "+",
          "+  return trainer",
          "+}",
        ].join("\n"),
        [
          "diff --git a/src/lib/team-title.ts b/src/lib/team-title.ts",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/lib/team-title.ts",
          "@@ -0,0 +1,3 @@",
          "+export function formatTeamTitle(trainerName: string, teamSize: number, maxSlots: number): string {",
          "+  return `${trainerName}'s team, ${teamSize} of ${maxSlots}`",
          "+}",
        ].join("\n"),
        [
          "diff --git a/src/main.tsx b/src/main.tsx",
          "--- a/src/main.tsx",
          "+++ b/src/main.tsx",
          "@@ -3,0 +4 @@ import { PokedexPage } from \"@/pages/pokedex/PokedexPage\"",
          "+import { TeamPage } from \"@/pages/team/TeamPage\"",
          "@@ -9,0 +11 @@ createRoot(rootElement).render(",
          "+    <TeamPage trainerId={1} maxSlots={6} />",
        ].join("\n"),
        [
          "diff --git a/src/pages/team/TeamPage.tsx b/src/pages/team/TeamPage.tsx",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/pages/team/TeamPage.tsx",
          "@@ -0,0 +1,45 @@",
          "+import { useEffect, useState } from \"react\"",
          "+import { publishTeam } from \"@/api/teams\"",
          "+import { useTrainer } from \"@/hooks/use-trainer\"",
          "+import { formatTeamTitle } from \"@/lib/team-title\"",
          "+import { TeamSlot } from \"./components/TeamSlot\"",
          "+",
          "+const LAST_TRAINER_KEY = \"team-builder.last-trainer\"",
          "+",
          "+interface TeamPageProps {",
          "+  trainerId: number",
          "+  maxSlots: number",
          "+}",
          "+",
          "+export function TeamPage({ trainerId, maxSlots }: TeamPageProps) {",
          "+  const [isPublishing, setIsPublishing] = useState(false)",
          "+  const trainer = useTrainer(trainerId)",
          "+",
          "+  useEffect(() => {",
          "+    localStorage.setItem(LAST_TRAINER_KEY, String(trainerId))",
          "+  }, [trainerId])",
          "+",
          "+  if (trainer === null) return <p>Loading the trainer…</p>",
          "+",
          "+  const title = formatTeamTitle(trainer.name, trainer.team.length, maxSlots)",
          "+",
          "+  const publish = async () => {",
          "+    setIsPublishing(true)",
          "+    await publishTeam(trainerId)",
          "+    setIsPublishing(false)",
          "+  }",
          "+",
          "+  return (",
          "+    <section>",
          "+      <h1>{title}</h1>",
          "+      <ul>",
          "+        {trainer.team.map((pokemon) => (",
          "+          <TeamSlot key={pokemon.id} pokemon={pokemon} />",
          "+        ))}",
          "+      </ul>",
          "+      <button type=\"button\" disabled={isPublishing} onClick={publish}>",
          "+        Publish the team",
          "+      </button>",
          "+    </section>",
          "+  )",
          "+}",
        ].join("\n"),
        [
          "diff --git a/src/pages/team/components/TeamSlot.tsx b/src/pages/team/components/TeamSlot.tsx",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/pages/team/components/TeamSlot.tsx",
          "@@ -0,0 +1,10 @@",
          "+import { formatNumber } from \"@/lib/format\"",
          "+import type { Pokemon } from \"@/types/pokemon\"",
          "+",
          "+export function TeamSlot({ pokemon }: { pokemon: Pokemon }) {",
          "+  return (",
          "+    <li>",
          "+      {formatNumber(pokemon.id)} {pokemon.name} · {pokemon.type}",
          "+    </li>",
          "+  )",
          "+}",
        ].join("\n"),
        [
          "diff --git a/src/types/trainer.ts b/src/types/trainer.ts",
          "--- a/src/types/trainer.ts",
          "+++ b/src/types/trainer.ts",
          "@@ -0,0 +1,2 @@",
          "+import type { Pokemon } from \"@/types/pokemon\"",
          "+",
          "@@ -3,0 +6 @@ export interface Trainer {",
          "+  team: Pokemon[]",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF, isSegmented: true })

    await expectTraceSnapshot(codegraph)
  })
})
