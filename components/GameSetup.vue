<template>
  <div class="bg-linear-to-tr from-green-100 to-blue-200 text-gray-900">
    <Screen>
      <header class="mb-6">
        <h1 class="text-3xl font-extrabold">
          30 Seconds
        </h1>
        <p class="mt-1 text-gray-600">
          {{ count === 4 ? 'Wie en welk team begint wordt willekeurig bepaald' : 'Wie begint wordt willekeurig bepaald' }}
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

      <fieldset class="mb-8">
        <legend class="mb-3 text-lg font-bold">
          Hoeveel spelers?
        </legend>

        <div class="grid grid-cols-3 gap-2">
          <label
              v-for="option in COUNT_OPTIONS"
              :key="option.value"
          >
            <input
                v-model="count"
                type="radio"
                name="player_count"
                class="peer sr-only"
                :value="option.value"
                @change="chooseCount(game)"
            >
            <span class="flex h-12 items-center justify-center rounded-xl bg-white text-lg font-semibold shadow-sm peer-checked:bg-emerald-700 peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-700">
              {{ option.label }}
            </span>
          </label>
        </div>
      </fieldset>

      <!-- Two or three players: just names; the game makes the teams -->
      <section
          v-if="count < 4"
          aria-labelledby="players-heading"
      >
        <h2
            id="players-heading"
            class="mb-1 text-lg font-bold"
        >
          Spelers
        </h2>
        <p class="mb-3 text-gray-600">
          {{ count === 2
            ? 'Om de beurt leg je uit en raadt de ander. Je scoort met je eigen beurten.'
            : 'Jullie spelen in drie duo\'s, elk met een eigen score. Wie niet meedoet is even stil.' }}
        </p>

        <div class="space-y-2 rounded-2xl bg-white p-4 shadow-sm">
          <div
              v-for="index in count"
              :key="index"
          >
            <label
                :for="`${inputId}-${index}`"
                class="mb-1 block text-sm font-semibold text-gray-600"
            >
              Speler {{ index }}
            </label>
            <input
                v-model="names[index - 1]"
                type="text"
                name="player_name"
                :id="`${inputId}-${index}`"
                placeholder="Speler naam"
                class="h-11 w-full rounded-xl border bg-gray-50 px-3"
            >
          </div>
        </div>

        <p
            v-if="count === 3"
            class="mt-3 text-gray-600"
        >
          Duo's: {{ pairs.join(' · ') }}
        </p>
      </section>

      <section
          v-else
          aria-labelledby="teams-heading"
      >
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
import { computed, ref, useId } from "vue";
import Game from "~/models/Game";
import TeamSetup from "~/components/TeamSetup.vue";
import Team from "~/models/Team";
import Player from "~/models/Player";
import Screen from "~/components/Screen.vue";
import ActionButton from "~/components/ActionButton.vue";
import { usePageColour } from "~/composables/usePageColour";
import { PAGE_SETUP } from "~/utils/teamColours";

const SCORE_OPTIONS = [10, 25, 50, 100];

// 2 and 3 are the duo and trio modes; 4 stands for "4 or more", in teams
const COUNT_OPTIONS = [
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4+' },
];

const props = defineProps({
  game: {
    type: Game,
    required: true,
  },
});

const emit = defineEmits(['resume-game']);

usePageColour(() => PAGE_SETUP);

const inputId = useId();

// Back on this screen after "Begin opnieuw", the same mode and names again
const count = ref(props.game.mode === 'duo' ? 2 : props.game.mode === 'trio' ? 3 : 4);
const names = ref(
  props.game.mode === 'duo' ? props.game.teams.map(team => team.players[0]!.name)
    : props.game.mode === 'trio' ? props.game.trioPlayers().map(player => player.name)
    : ['Speler 1', 'Speler 2', 'Speler 3'],
);
while (names.value.length < 3) {
  names.value.push(`Speler ${names.value.length + 1}`);
}

const players = computed(() => names.value.slice(0, count.value).map((name, i) => name.trim() || `Speler ${i + 1}`));
const pairs = computed(() => players.value.map((name, i) => `${name} & ${players.value[(i + 1) % players.value.length]}`));

// Teams again after a duo or trio: the usual two teams of two to start from
function chooseCount(game: Game) {
  if (count.value === 4 && game.mode !== 'teams') {
    game.mode = 'teams';
    game.teams = [];
    addTeam(game);
    addTeam(game);
  }
}

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
  if (count.value < 4) {
    game.setPlayers(players.value.map(name => new Player(name)));
  }
  game.setUp();
}
</script>
