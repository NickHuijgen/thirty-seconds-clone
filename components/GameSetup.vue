<template>
  <div class="bg-linear-to-tr from-green-100 to-blue-200 text-gray-900">
    <Screen>
      <header class="mb-6">
        <h1 class="text-3xl font-extrabold">
          30 Seconds
        </h1>
        <p class="mt-1 text-gray-600">
          Wie en welk team begint wordt willekeurig bepaald
        </p>
      </header>

      <button
          v-if="game.canLoadSaved()"
          type="button"
          class="mb-6 flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm"
          @click="emit('resume-game')"
      >
        <span
            class="material-icons text-emerald-700"
            aria-hidden="true"
        >
          play_circle
        </span>
        <span class="flex-1 font-semibold">Ga verder met bestaand spel</span>
        <span
            class="material-icons text-gray-400"
            aria-hidden="true"
        >
          chevron_right
        </span>
      </button>

      <section aria-labelledby="teams-heading">
        <h2
            id="teams-heading"
            class="mb-3 text-lg font-bold"
        >
          Teams
        </h2>

        <div class="space-y-4">
          <TeamSetup
              v-for="(team, index) in game.teams"
              :key="index"
              :team="team"
              :game="game"
              :can-remove="game.teams.length > 2"
              :index="index"
              @remove-team="removeTeam(game, team)"
          />
        </div>

        <button
            type="button"
            class="mt-4 flex h-12 w-full items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-gray-400 font-semibold text-gray-700"
            @click="addTeam(game)"
        >
          <span
              class="material-icons"
              aria-hidden="true"
          >
            add
          </span>
          Voeg team toe
        </button>
      </section>

      <fieldset class="mt-8">
        <legend class="mb-3 text-lg font-bold">
          Tot hoeveel punten spelen we?
        </legend>

        <div class="grid grid-cols-4 gap-2">
          <label
              v-for="score in SCORE_OPTIONS"
              :key="score"
          >
            <input
                v-model="game.max_score"
                type="radio"
                name="max_score"
                class="peer sr-only"
                :value="score"
            >
            <span class="flex h-12 items-center justify-center rounded-xl bg-white text-lg font-semibold shadow-sm peer-checked:bg-emerald-700 peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-700">
              {{ score }}
            </span>
          </label>
        </div>
      </fieldset>

      <template #action>
        <ActionButton
            class="bg-emerald-700 text-white"
            @click="finishSetup(game)"
        >
          Begin nieuw spel
        </ActionButton>
      </template>
    </Screen>
  </div>
</template>

<script setup lang="ts">
import Game from "~/models/Game";
import TeamSetup from "~/components/TeamSetup.vue";
import Team from "~/models/Team";
import Player from "~/models/Player";
import Screen from "~/components/Screen.vue";
import ActionButton from "~/components/ActionButton.vue";
import { usePageColour } from "~/composables/usePageColour";
import { PAGE_SETUP } from "~/utils/teamColours";

const SCORE_OPTIONS = [10, 25, 50, 100];

defineProps({
  game: {
    type: Game,
    required: true,
  },
});

const emit = defineEmits(['resume-game']);

usePageColour(() => PAGE_SETUP);

function addTeam(game: Game) {
  const team = new Team('Team ' + (game.teamCount() + 1));

  const currentPlayerCount = game.playerCount();

  team.addPlayer(new Player('Speler ' + (currentPlayerCount + 1)));
  team.addPlayer(new Player('Speler ' + (currentPlayerCount + 2)));

  game.addTeam(team);
}

function removeTeam(game: Game, team: Team) {
  game.removeTeam(team);
}

function finishSetup(game: Game) {
  game.setUp();
}
</script>
