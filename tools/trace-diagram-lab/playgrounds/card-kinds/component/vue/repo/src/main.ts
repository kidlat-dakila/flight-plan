import { createApp } from "vue"
import PokedexPage from "@/views/pokedex/PokedexPage.vue"

const pokedexApp = createApp(PokedexPage)

pokedexApp.mount("#pokedex")
