<template>
  <Transition
      name="screen"
      mode="out-in"
  >
    <OnlineJoin
        v-if="!state || !playerId"
        key="join"
        :initial-code="routeCode ?? ''"
        :initial-name="savedName"
        :busy="busy || status === 'connecting'"
        :error="error"
        @submit="joinOrCreate"
        @invalid="showError"
    />
    <OnlineLobby
        v-else-if="!state.game.is_in_progress && !state.game.is_finished"
        key="lobby"
        :state="state"
        :player-id="playerId"
        :is-host="isHost"
        @send="send"
        @leave="leaveRoom()"
    />
    <Playing
        v-else-if="!state.game.is_finished"
        key="playing"
        :game="game"
        :guessed="state.guessed"
        online
        :is-describer="isDescriber"
        :is-guesser="isGuesser"
        :can-score="canScore"
        :scorer-name="describer?.name ?? ''"
        @start-turn="startTurn()"
        @end-turn="endTurn()"
        @toggle-word="toggleWord"
        @finish-turn="send({ type: 'finishTurn', turn: state.turn })"
    >
      <template #pre-turn-top>
        <div
            v-if="(describer && !describer.connected) || (isHost && spectators.length > 0)"
            class="mt-6 space-y-4"
        >
          <div
              v-if="describer && !describer.connected"
              class="rounded-2xl bg-white/10 p-4 font-semibold"
          >
            {{ describer.name }} is niet verbonden.
            <template v-if="isHost">
              Wacht tot ze terug zijn, of haal ze uit het spel.
              <button
                  type="button"
                  class="mt-3 flex h-11 items-center rounded-xl bg-white px-4 font-semibold text-gray-900"
                  @click="confirmKickDescriber?.open()"
              >
                Haal {{ describer.name }} uit het spel
              </button>
              <ConfirmDialog
                  ref="confirmKickDescriber"
                  :message="`${describer.name} doet dan niet meer mee aan dit spel.`"
                  confirm-label="Verwijderen"
                  @confirm="send({ type: 'kick', playerId: describer.id })"
              />
            </template>
          </div>

          <!-- New players join as spectators; the host gives them a seat -->
          <div
              v-if="isHost && spectators.length > 0"
              class="rounded-2xl bg-white p-4 text-gray-900 shadow-lg"
          >
            <h2 class="mb-3 font-bold">
              Nieuwe spelers
            </h2>
            <ul class="space-y-2">
              <MemberRow
                  v-for="member in spectators"
                  :key="member.id"
                  :member="member"
                  :teams="state.game.teams"
                  :team-index="null"
                  :is-host="isHost"
                  :is-you="member.id === playerId"
                  :host-id="state.host_id"
                  :allow-unassign="false"
                  @assign="(target, to) => send({ type: 'assignPlayer', playerId: target, teamIndex: to })"
                  @kick="target => send({ type: 'kick', playerId: target })"
              />
            </ul>
          </div>
        </div>
      </template>
      <template #pre-turn>
        <div class="mt-6 flex flex-col">
          <p
              v-if="isSpectator"
              class="font-semibold text-white/80"
          >
            Je kijkt mee. De host kan je in een team zetten.
          </p>
          <LeaveButton
              class="mt-2 self-center text-white"
              in-game
              @leave="leaveRoom()"
          />
        </div>
      </template>
    </Playing>
    <PostGame
        v-else
        key="finished"
        :game="game"
        :can-restart="isHost"
        @restart-game="send({ type: 'restart' })"
    >
      <LeaveButton
          class="mt-6 self-center text-white"
          @leave="leaveRoom()"
      />
    </PostGame>
  </Transition>

  <!-- Connection trouble and refused actions, just above the screen's main button (whose tap usually
       caused them). Kept off the screen's edge and see-through to taps (pointer-events-none), so it never
       blocks a button or tints Safari's toolbars. -->
  <div
      class="pointer-events-none fixed inset-x-4 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+4.5rem)] z-20 flex flex-col items-center gap-2"
      aria-live="polite"
  >
    <p
        v-if="status === 'reconnecting'"
        class="rounded-full bg-gray-900/90 px-4 py-2 text-sm font-semibold text-white shadow-lg"
    >
      Verbinding herstellen…
    </p>
    <p
        v-if="error && state"
        class="rounded-full bg-red-700 px-4 py-2 text-center text-sm font-semibold text-white shadow-lg"
    >
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import OnlineJoin from "~/components/OnlineJoin.vue";
import OnlineLobby from "~/components/OnlineLobby.vue";
import MemberRow from "~/components/MemberRow.vue";
import LeaveButton from "~/components/LeaveButton.vue";
import ConfirmDialog from "~/components/ConfirmDialog.vue";
import Playing from "~/components/Playing.vue";
import PostGame from "~/components/PostGame.vue";
import { createRoom, readSession, useOnlineGame } from "~/composables/useOnlineGame";
import { useWakeLock } from "~/composables/useWakeLock";
import { useTurnHaptics } from "~/composables/useTurnHaptics";
import { normaliseCode } from "~/server/protocol";
import { loadSound } from "~/utils/sounds";

const route = useRoute();
const router = useRouter();

const { state, game, playerId, status, error, isHost, isDescriber, connect, send, leave, showError } = useOnlineGame();

const busy = ref(false);
const confirmKickDescriber = ref<InstanceType<typeof ConfirmDialog> | null>(null);
const routeCode = computed(() => normaliseCode(String(route.params.code ?? '')));
const savedName = readSession()?.name ?? '';

useWakeLock(computed(() => !!state.value));
useTurnHaptics(game);

const describer = computed(() => state.value?.members.find(m => m.id === state.value?.describer_id) ?? null);

// The describer ticks; when they're gone, the host does it for them (the server checks the same)
const canScore = computed(() => isDescriber.value || (isHost.value && !describer.value?.connected));

const seated = computed(() => new Set(state.value?.game.teams.flatMap(team => team.players.map(p => p.id)) ?? []));
const spectators = computed(() => state.value?.members.filter(m => !seated.value.has(m.id) && m.connected) ?? []);
const isSpectator = computed(() => !!playerId.value && !seated.value.has(playerId.value));

// The describer's teammates: they're the ones guessing
const isGuesser = computed(() => {
  const team = game.value.activeTeam();

  return !isDescriber.value && !!team?.players.some(p => p.id === playerId.value);
});

// Only the describer's phone plays the sounds (see AGENTS.md). Loaded in the "Start beurt" tap, because
// mobile browsers only play audio that a tap started; the time-up boom plays later from the countdown.
let timeUp: { play(): void } | null = null;

function startTurn() {
  loadSound('turn-start').play();
  timeUp = loadSound('vine-boom');
  send({ type: 'startTurn', turn: state.value!.turn });
}

function endTurn() {
  loadSound('vine-boom').play();
  timeUp = null;
  send({ type: 'endTurnEarly', turn: state.value!.turn });
}

watch(() => game.value.turn_timer, (seconds, previous) => {
  if (seconds === 1 && previous === 2 && isDescriber.value) {
    timeUp?.play();
    timeUp = null;
  }
});

function toggleWord(index: number) {
  const current = state.value!;
  send({ type: 'setWord', turn: current.turn, index, guessed: !current.guessed.includes(index) });
}

async function joinOrCreate(name: string, code: string | null) {
  busy.value = true;

  try {
    const roomCode = code ?? await createRoom();
    await router.replace(`/online/${roomCode}`);
    connect(roomCode, name);
  } catch (failure) {
    console.log('Creating a room failed:', failure);
    showError(navigator.onLine === false ? 'Online spelen heeft internet nodig' : 'Er ging iets mis. Probeer het opnieuw.');
  } finally {
    busy.value = false;
  }
}

function leaveRoom() {
  leave();
  router.replace('/online');
}

// Back in the same seat after a refresh or a locked screen
onMounted(() => {
  const session = readSession();

  if (session && (!routeCode.value || routeCode.value === session.code)) {
    router.replace(`/online/${session.code}`);
    connect(session.code, session.name);
  }
});
</script>
