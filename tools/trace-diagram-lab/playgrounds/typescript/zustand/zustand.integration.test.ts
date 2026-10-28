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

describe("typescript/zustand", () => {
  it("Implement store useTeamStore", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/components/Header.tsx b/src/components/Header.tsx",
          "--- a/src/components/Header.tsx",
          "+++ b/src/components/Header.tsx",
          "@@ -0,0 +1,2 @@",
          "+import { selectTeamSize, useTeamStore } from \"@/stores/team-store\"",
          "+",
          "@@ -1,0 +4 @@ export function Header() {",
          "+  const teamSize = useTeamStore(selectTeamSize)",
          "@@ -4,0 +8 @@ export function Header() {",
          "+      <span>{teamSize} trainers in the team</span>",
        ].join("\n"),
        [
          "diff --git a/src/lib/team-rules.ts b/src/lib/team-rules.ts",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/lib/team-rules.ts",
          "@@ -0,0 +1,5 @@",
          "+export const TEAM_LIMIT = 6",
          "+",
          "+export function canJoinTeam(memberIds: number[], trainerId: number): boolean {",
          "+  return memberIds.length < TEAM_LIMIT && !memberIds.includes(trainerId)",
          "+}",
        ].join("\n"),
        [
          "diff --git a/src/pages/trainers/components/TrainerRow.tsx b/src/pages/trainers/components/TrainerRow.tsx",
          "--- a/src/pages/trainers/components/TrainerRow.tsx",
          "+++ b/src/pages/trainers/components/TrainerRow.tsx",
          "@@ -0,0 +1 @@",
          "+import { useTeamStore } from \"@/stores/team-store\"",
          "@@ -3,0 +5,9 @@ export function TrainerRow({ trainer }: { trainer: Trainer }) {",
          "+  const isMember = useTeamStore((state) => state.memberIds.includes(trainer.id))",
          "+  const addMember = useTeamStore((state) => state.addMember)",
          "+  const removeMember = useTeamStore((state) => state.removeMember)",
          "+",
          "+  const toggleMember = () => {",
          "+    if (isMember) removeMember(trainer.id)",
          "+    else addMember(trainer.id)",
          "+  }",
          "+",
          "@@ -7,0 +18,5 @@ export function TrainerRow({ trainer }: { trainer: Trainer }) {",
          "+      <td>",
          "+        <button type=\"button\" onClick={toggleMember}>",
          "+          {isMember ? \"Leave the team\" : \"Join the team\"}",
          "+        </button>",
          "+      </td>",
        ].join("\n"),
        [
          "diff --git a/src/stores/team-store.ts b/src/stores/team-store.ts",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/stores/team-store.ts",
          "@@ -0,0 +1,17 @@",
          "+import { create } from \"zustand\"",
          "+import { canJoinTeam } from \"@/lib/team-rules\"",
          "+",
          "+interface TeamState {",
          "+  memberIds: number[]",
          "+  addMember: (trainerId: number) => void",
          "+  removeMember: (trainerId: number) => void",
          "+}",
          "+",
          "+export const useTeamStore = create<TeamState>()((set) => ({",
          "+  memberIds: [],",
          "+  addMember: (trainerId) =>",
          "+    set((state) => (canJoinTeam(state.memberIds, trainerId) ? { memberIds: [...state.memberIds, trainerId] } : state)),",
          "+  removeMember: (trainerId) => set((state) => ({ memberIds: state.memberIds.filter((id) => id !== trainerId) })),",
          "+}))",
          "+",
          "+export const selectTeamSize = (state: TeamState): number => state.memberIds.length",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF, isSegmented: true })

    await expectTraceSnapshot(codegraph)
  })
})
