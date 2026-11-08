<template>
  <div
      class="text-white [&_:focus-visible]:outline-white"
      :class="style.solid"
  >
    <Screen>
      <div class="pt-4 text-center">
        <p class="text-lg font-semibold text-white/80">
          {{ online ? team.name : `${team.name} is aan de beurt` }}
        </p>
        <p
            v-if="!online || isDescriber"
            class="mt-6 text-xl"
        >
          {{ online ? 'Jij bent aan de beurt' : 'Geef de telefoon aan' }}
        </p>
        <p
            class="text-5xl font-extrabold break-words motion-safe:animate-bounce-in"
            :class="!online || isDescriber ? 'mt-1' : 'mt-6'"
        >
          {{ team.activePlayer()?.name }}
        </p>
        <p
            v-if="online && !isDescriber"
            class="mt-1 text-xl"
        >
          is aan de beurt
        </p>
        <p
            v-if="online && !isDescriber"
            class="mx-auto mt-4 w-fit rounded-full px-4 py-2 text-lg font-bold"
            :class="isGuesser ? ['bg-white', style.text] : 'bg-black/25 text-white'"
        >
          {{ isGuesser ? 'Jij moet raden!' : 'Jij moet stil zijn' }}
        </p>
      </div>

      <!-- Online: things the host has to act on, where they can't be missed -->
      <slot name="top" />

      <div class="mt-8 rounded-2xl bg-white p-4 text-gray-900 shadow-lg">
        <Leaderboard :game="game" />
      </div>

      <dl class="mt-6 space-y-2 text-white/90">
        <div>
          <dt class="text-sm font-semibold text-white/70">
            Deze spelers mogen raden
          </dt>
          <dd>{{ team.inactivePlayers().map(player => player.name).join(', ') }}</dd>
        </div>
        <div>
          <dt class="text-sm font-semibold text-white/70">
            Volgende beurt
          </dt>
          <dd>{{ game.nextUpTeam().activePlayer()?.name }} van {{ game.nextUpTeam().name }}</dd>
        </div>
      </dl>

      <!-- Online: the words of the turn that just ended, so anyone who looked away can check the score -->
      <section
          v-if="lastTurn"
          class="mt-6 rounded-2xl bg-white/10 p-4"
          aria-labelledby="last-turn-heading"
      >
        <h2
            id="last-turn-heading"
            class="text-sm font-semibold text-white/70"
        >
          Vorige beurt · {{ lastTurn.team }} · {{ lastTurn.score }} geraden
        </h2>
        <ul class="mt-2 space-y-1">
          <li
              v-for="(word, index) in lastTurn.words"
              :key="index"
              class="flex items-center gap-2"
              :class="lastTurn.guessed.includes(index) ? 'font-semibold' : 'text-white/70'"
          >
            <span
                class="material-icons text-xl!"
                aria-hidden="true"
            >
              {{ lastTurn.guessed.includes(index) ? 'check_circle' : 'radio_button_unchecked' }}
            </span>
            <span class="sr-only">{{ lastTurn.guessed.includes(index) ? 'Geraden:' : 'Niet geraden:' }}</span>
            <span class="min-w-0 break-words">{{ word }}</span>
          </li>
        </ul>
      </section>

      <slot />

      <template
          v-if="isDescriber"
          #action
      >
        <ActionButton
            class="bg-white"
            :class="style.text"
            @click="emit('start-turn')"
        >
          Start beurt
        </ActionButton>
      </template>
      <template
          v-else
          #action
      >
        <p class="flex h-14 items-center justify-center text-center font-semibold text-white/80">
          Wachten tot {{ team.activePlayer()?.name }} de beurt start…
        </p>
      </template>
    </Screen>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import Game from "~/models/Game";
import Leaderboard from "~/components/Leaderboard.vue";
import Screen from "~/components/Screen.vue";
import ActionButton from "~/components/ActionButton.vue";
import { TEAM_STYLES } from "~/utils/teamColours";
import { usePageColour } from "~/composables/usePageColour";

const props = defineProps({
  game: {
    type: Game,
    required: true,
  },
  // Online, every player has their own phone; on one phone the holder is always the describer
  online: {
    type: Boolean,
    default: false,
  },
  isDescriber: {
    type: Boolean,
    default: true,
  },
  // Online: this phone belongs to one of the describer's teammates
  isGuesser: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['start-turn']);

const team = computed(() => props.game.activeTeam());

// Only online play records the words of a turn
const lastTurn = computed(() => {
  const last = props.game.last_turn;

  if (!last?.words) {
    return null;
  }

  return {
    team: props.game.teams.find(t => t.index === last.team_index)?.name ?? '',
    score: last.score,
    words: last.words,
    guessed: last.guessed ?? [],
  };
});
const style = computed(() => TEAM_STYLES[team.value.colour]);

usePageColour(() => style.value.hex);
</script>
