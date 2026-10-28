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

describe("typescript/vue", () => {
  it("Implement page PokemonPage", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/api/pokemon.ts b/src/api/pokemon.ts",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/api/pokemon.ts",
          "@@ -0,0 +1,13 @@",
          "+import { request } from \"@/api/client\"",
          "+",
          "+export interface Pokemon {",
          "+  id: number",
          "+  name: string",
          "+  level: number",
          "+  trainer_id: number | null",
          "+}",
          "+",
          "+export const fetchPokemon = (trainerId: number | null): Promise<Pokemon[]> => {",
          "+  const query = trainerId === null ? \"\" : `?trainer_id=${trainerId}`",
          "+  return request<Pokemon[]>(`/pokemon${query}`)",
          "+}",
        ].join("\n"),
        [
          "diff --git a/src/composables/use-pokemon.ts b/src/composables/use-pokemon.ts",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/composables/use-pokemon.ts",
          "@@ -0,0 +1,19 @@",
          "+import { ref, watch, type Ref } from \"vue\"",
          "+import { fetchPokemon, type Pokemon } from \"@/api/pokemon\"",
          "+",
          "+export const usePokemon = (trainerId: Ref<number | null>) => {",
          "+  const pokemon = ref<Pokemon[]>([])",
          "+  const isPending = ref(true)",
          "+",
          "+  watch(",
          "+    trainerId,",
          "+    async (id) => {",
          "+      isPending.value = true",
          "+      pokemon.value = await fetchPokemon(id)",
          "+      isPending.value = false",
          "+    },",
          "+    { immediate: true },",
          "+  )",
          "+",
          "+  return { pokemon, isPending }",
          "+}",
        ].join("\n"),
        [
          "diff --git a/src/views/pokemon/components/TrainerPicker.vue b/src/views/pokemon/components/TrainerPicker.vue",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/views/pokemon/components/TrainerPicker.vue",
          "@@ -0,0 +1,17 @@",
          "+<script setup lang=\"ts\">",
          "+import type { Trainer } from \"@/types/trainer\"",
          "+",
          "+defineProps<{ trainers: Trainer[], selectedId: number | null }>()",
          "+const emit = defineEmits<{ (event: \"select\", trainerId: number | null): void }>()",
          "+",
          "+const pickTrainer = (value: string) => {",
          "+  emit(\"select\", value === \"\" ? null : Number(value))",
          "+}",
          "+</script>",
          "+",
          "+<template>",
          "+  <select :value=\"selectedId ?? ''\" @change=\"pickTrainer(($event.target as HTMLSelectElement).value)\">",
          "+    <option value=\"\">Every trainer</option>",
          "+    <option v-for=\"trainer in trainers\" :key=\"trainer.id\" :value=\"trainer.id\">{{ trainer.name }}</option>",
          "+  </select>",
          "+</template>",
        ].join("\n"),
        [
          "diff --git a/src/views/pokemon/PokemonPage.vue b/src/views/pokemon/PokemonPage.vue",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/views/pokemon/PokemonPage.vue",
          "@@ -0,0 +1,29 @@",
          "+<script setup lang=\"ts\">",
          "+import { computed, ref } from \"vue\"",
          "+import { usePokemon } from \"@/composables/use-pokemon\"",
          "+import { useTrainers } from \"@/composables/use-trainers\"",
          "+import TrainerPicker from \"@/views/pokemon/components/TrainerPicker.vue\"",
          "+",
          "+const trainerId = ref<number | null>(null)",
          "+const { trainers } = useTrainers()",
          "+const { pokemon, isPending } = usePokemon(trainerId)",
          "+const highestLevel = computed(() => Math.max(0, ...pokemon.value.map((entry) => entry.level)))",
          "+",
          "+const selectTrainer = (id: number | null) => {",
          "+  trainerId.value = id",
          "+}",
          "+</script>",
          "+",
          "+<template>",
          "+  <section>",
          "+    <h1>Pokemon</h1>",
          "+    <TrainerPicker :trainers=\"trainers\" :selected-id=\"trainerId\" @select=\"selectTrainer\" />",
          "+    <p v-if=\"isPending\">Loading the Pokemon…</p>",
          "+    <template v-else>",
          "+      <p>The strongest is level {{ highestLevel }}.</p>",
          "+      <ul>",
          "+        <li v-for=\"entry in pokemon\" :key=\"entry.id\">{{ entry.name }} Lv. {{ entry.level }}</li>",
          "+      </ul>",
          "+    </template>",
          "+  </section>",
          "+</template>",
        ].join("\n"),
        [
          "diff --git a/src/App.vue b/src/App.vue",
          "--- a/src/App.vue",
          "+++ b/src/App.vue",
          "@@ -5,0 +6 @@ import ItemsPage from \"@/views/items/ItemsPage.vue\"",
          "+import PokemonPage from \"@/views/pokemon/PokemonPage.vue\"",
          "@@ -8 +9 @@ import TrainersPage from \"@/views/trainers/TrainersPage.vue\"",
          "-type PageName = \"trainers\" | \"items\" | \"help\"",
          "+type PageName = \"trainers\" | \"pokemon\" | \"items\" | \"help\"",
          "@@ -15,0 +17 @@ const page = ref<PageName>(\"trainers\")",
          "+    <BaseButton variant=\"ghost\" @click=\"page = 'pokemon'\">Pokemon</BaseButton>",
          "@@ -20,0 +23 @@ const page = ref<PageName>(\"trainers\")",
          "+    <PokemonPage v-else-if=\"page === 'pokemon'\" />",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF, isSegmented: true })

    await expectTraceSnapshot(codegraph)
  })
})
