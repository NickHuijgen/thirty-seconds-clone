<template>
  <div class="bg-linear-to-tr from-green-100 to-blue-200 text-gray-900">
    <Screen>
      <header class="mb-6 flex items-start justify-between gap-4">
        <div>
          <p class="text-sm font-semibold text-gray-600">
            Lobbycode
          </p>
          <p class="text-5xl font-extrabold tracking-[0.2em]">
            {{ state.code }}
          </p>
        </div>
        <button
            type="button"
            class="flex h-12 shrink-0 items-center gap-2 rounded-2xl bg-white px-4 font-semibold text-emerald-700 shadow-sm"
            @click="share()"
        >
          <span
              class="material-icons"
              aria-hidden="true"
          >
            {{ copied ? 'check' : 'share' }}
          </span>
          {{ copied ? 'Gekopieerd' : 'Deel link' }}
        </button>
      </header>

      <p class="mb-6 text-gray-700">
        <template v-if="isHost">
          Jij bent de host. Zet iedereen in een team en begin het spel.
        </template>
        <template v-else>
          {{ hostName }} is de host en verdeelt de teams.
        </template>
      </p>

      <section aria-labelledby="online-teams-heading">
        <h2
            id="online-teams-heading"
            class="mb-3 text-lg font-bold"
        >
          Teams
        </h2>

        <div class="space-y-4">
          <div
              v-for="(team, teamIndex) in state.game.teams"
              :key="`${teamIndex}-${team.colour}`"
              class="relative rounded-2xl border-l-8 bg-white p-4 shadow-sm"
              :class="TEAM_STYLES[team.colour].border"
          >
            <RemoveButton
                class="absolute top-1 right-1"
                :can-remove="isHost && state.game.teams.length > 2"
                label="Verwijder team"
                @click="emit('send', { type: 'removeTeam', teamIndex })"
            />

            <template v-if="isHost">
              <label
                  :for="`${id}-team-${teamIndex}`"
                  class="mb-1 block text-sm font-semibold"
                  :class="TEAM_STYLES[team.colour].text"
              >
                Team {{ teamIndex + 1 }}
              </label>
              <input
                  :value="team.name"
                  type="text"
                  :id="`${id}-team-${teamIndex}`"
                  :maxlength="MAX_NAME_LENGTH"
                  placeholder="Team naam"
                  class="h-12 w-full rounded-xl border-2 px-3 text-lg font-semibold"
                  @change="rename(teamIndex, $event)"
              >
            </template>
            <h3
                v-else
                class="text-lg font-semibold"
                :class="TEAM_STYLES[team.colour].text"
            >
              {{ team.name }}
            </h3>

            <ul class="mt-3 space-y-2">
              <MemberRow
                  v-for="player in team.players"
                  :key="player.id"
                  :member="memberOf(player.id)"
                  :teams="state.game.teams"
                  :team-index="teamIndex"
                  :is-host="isHost"
                  :is-you="player.id === playerId"
                  :host-id="state.host_id"
                  @assign="(target, to) => emit('send', { type: 'assignPlayer', playerId: target, teamIndex: to })"
                  @kick="target => emit('send', { type: 'kick', playerId: target })"
              />
              <li
                  v-if="team.players.length === 0"
                  class="text-gray-500"
              >
                Nog niemand
              </li>
            </ul>
          </div>
        </div>

        <button
            v-if="isHost"
            type="button"
            class="mt-4 flex h-12 w-full items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-gray-400 font-semibold text-gray-700"
            @click="emit('send', { type: 'addTeam' })"
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

      <section
          v-if="waiting.length > 0"
          class="mt-8"
          aria-labelledby="online-waiting-heading"
      >
        <h2
            id="online-waiting-heading"
            class="mb-3 text-lg font-bold"
        >
          Zonder team
        </h2>
        <ul class="space-y-2 rounded-2xl bg-white p-4 shadow-sm">
          <MemberRow
              v-for="member in waiting"
              :key="member.id"
              :member="member"
              :teams="state.game.teams"
              :team-index="null"
              :is-host="isHost"
              :is-you="member.id === playerId"
              :host-id="state.host_id"
              @assign="(target, to) => emit('send', { type: 'assignPlayer', playerId: target, teamIndex: to })"
              @kick="target => emit('send', { type: 'kick', playerId: target })"
          />
        </ul>
      </section>

      <fieldset
          v-if="isHost"
          class="mt-8"
      >
        <legend class="mb-3 text-lg font-bold">
          Tot hoeveel punten spelen we?
        </legend>

        <div class="grid grid-cols-4 gap-2">
          <label
              v-for="score in SCORE_OPTIONS"
              :key="score"
          >
            <input
                :checked="state.game.max_score === score"
                type="radio"
                :name="`${id}-max-score`"
                class="peer sr-only"
                :value="score"
                @change="emit('send', { type: 'setMaxScore', score })"
            >
            <span class="flex h-12 items-center justify-center rounded-xl bg-white text-lg font-semibold shadow-sm peer-checked:bg-emerald-700 peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-700">
              {{ score }}
            </span>
          </label>
        </div>
      </fieldset>
      <p
          v-else
          class="mt-8 font-semibold"
      >
        We spelen tot {{ state.game.max_score }} punten
      </p>

      <LeaveButton
          class="mt-8 self-center text-gray-700"
          @leave="emit('leave')"
      />

      <template #action>
        <ActionButton
            v-if="isHost"
            class="bg-emerald-700 text-white"
            @click="emit('send', { type: 'start' })"
        >
          Begin spel
        </ActionButton>
        <p
            v-else
            class="flex h-14 items-center justify-center text-center font-semibold text-gray-700"
        >
          Wachten tot {{ hostName }} het spel start…
        </p>
      </template>
    </Screen>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId, type PropType } from "vue";
import Screen from "~/components/Screen.vue";
import ActionButton from "~/components/ActionButton.vue";
import RemoveButton from "~/components/RemoveButton.vue";
import MemberRow from "~/components/MemberRow.vue";
import LeaveButton from "~/components/LeaveButton.vue";
import { MAX_NAME_LENGTH, type ClientMessage, type MemberView, type RoomView } from "~/server/protocol";
import { usePageColour } from "~/composables/usePageColour";
import { PAGE_SETUP, TEAM_STYLES } from "~/utils/teamColours";

const SCORE_OPTIONS = [10, 25, 50, 100];

const props = defineProps({
  state: {
    type: Object as PropType<RoomView>,
    required: true,
  },
  playerId: {
    type: String,
    required: true,
  },
  isHost: {
    type: Boolean,
    required: true,
  },
});

const emit = defineEmits<{ send: [message: ClientMessage], leave: [] }>();

const id = useId();
const copied = ref(false);

usePageColour(() => PAGE_SETUP);

const hostName = computed(() => props.state.members.find(m => m.id === props.state.host_id)?.name ?? 'De host');

// Everyone the host hasn't put in a team yet
const waiting = computed(() => {
  const seated = new Set(props.state.game.teams.flatMap(team => team.players.map(p => p.id)));

  return props.state.members.filter(m => !seated.has(m.id));
});

function memberOf(id: string): MemberView {
  return props.state.members.find(m => m.id === id) ?? { id, name: '?', connected: false };
}

function rename(teamIndex: number, event: Event) {
  emit('send', { type: 'renameTeam', teamIndex, name: (event.target as HTMLInputElement).value });
}

// The phone's own share sheet where there is one, otherwise copy the link
async function share() {
  const url = `${location.origin}/online/${props.state.code}`;

  try {
    if (navigator.share) {
      await navigator.share({ title: '30 Seconds', text: `Doe mee met lobby ${props.state.code}`, url });

      return;
    }

    await navigator.clipboard.writeText(url);
    copied.value = true;
    setTimeout(() => copied.value = false, 2000);
  } catch {
    // Share sheet closed, or no clipboard access: the code is on screen anyway
  }
}
</script>
