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

describe("card-kinds/state/redux", () => {
  it("Modified slice partySlice to track the load status of the party", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/api/pokemon-api.ts b/src/api/pokemon-api.ts",
          "--- a/src/api/pokemon-api.ts",
          "+++ b/src/api/pokemon-api.ts",
          "@@ -6,0 +7 @@ export const pokemonApi = createApi({",
          "+  tagTypes: [\"Suggestions\"],",
          "@@ -9,0 +11 @@ export const pokemonApi = createApi({",
          "+      providesTags: [\"Suggestions\"],",
          "@@ -12,0 +15 @@ export const pokemonApi = createApi({",
          "+      invalidatesTags: [\"Suggestions\"],",
        ].join("\n"),
        [
          "diff --git a/src/store/party-slice.ts b/src/store/party-slice.ts",
          "--- a/src/store/party-slice.ts",
          "+++ b/src/store/party-slice.ts",
          "@@ -4,0 +5,2 @@ import type { Pokemon } from \"@/types/pokemon\"",
          "+type PartyStatus = \"idle\" | \"loading\" | \"failed\"",
          "+",
          "@@ -6 +8 @@ interface PartyRoot {",
          "-  party: { members: Pokemon[] }",
          "+  party: { members: Pokemon[], status: PartyStatus }",
          "@@ -12,0 +15 @@ export const loadParty = createAsyncThunk(\"party/load\", async () => {",
          "+  if (!response.ok) throw new Error(`Loading the party failed with ${response.status}.`)",
          "@@ -18 +21 @@ export const partySlice = createSlice({",
          "-  initialState: { members: [] as Pokemon[] },",
          "+  initialState: { members: [] as Pokemon[], status: \"idle\" as PartyStatus },",
          "@@ -21 +24 @@ export const partySlice = createSlice({",
          "-      if (state.members.length < PARTY_LIMIT) state.members.push(action.payload)",
          "+      if (state.status === \"idle\" && state.members.length < PARTY_LIMIT) state.members.push(action.payload)",
          "@@ -28,3 +31,11 @@ export const partySlice = createSlice({",
          "-    builder.addCase(loadParty.fulfilled, (state, action) => {",
          "-      state.members = action.payload",
          "-    })",
          "+    builder",
          "+      .addCase(loadParty.pending, (state) => {",
          "+        state.status = \"loading\"",
          "+      })",
          "+      .addCase(loadParty.fulfilled, (state, action) => {",
          "+        state.members = action.payload",
          "+        state.status = \"idle\"",
          "+      })",
          "+      .addCase(loadParty.rejected, (state) => {",
          "+        state.status = \"failed\"",
          "+      })",
          "@@ -37 +48 @@ listenerMiddleware.startListening({",
          "-    localStorage.setItem(\"party.last-released\", String(action.payload))",
          "+    localStorage.setItem(\"party.last-released\", JSON.stringify({ pokemonId: action.payload, releasedAt: Date.now() }))",
          "@@ -42 +53,4 @@ export const selectMembers = (state: PartyRoot) => state.party.members",
          "-export const selectOpenSlots = createSelector([selectMembers], (members) => PARTY_LIMIT - members.length)",
          "+export const selectStatus = (state: PartyRoot) => state.party.status",
          "+export const selectOpenSlots = createSelector([selectMembers, selectStatus], (members, status) =>",
          "+  status === \"loading\" ? 0 : PARTY_LIMIT - members.length,",
          "+)",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF, isSegmented: true })

    await expectTraceSnapshot(codegraph)
  })
})
