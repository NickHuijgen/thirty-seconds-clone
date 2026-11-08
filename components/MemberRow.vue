<template>
  <!-- One person in the online lobby or the host's list of new players: their name, and for the host,
       which team they're in and a way to remove them -->
  <li class="flex items-center gap-2">
    <span
        class="min-w-0 flex-1 truncate font-semibold"
        :class="member.connected ? '' : 'text-gray-400'"
    >
      {{ member.name }}
      <span
          v-if="tags"
          class="font-normal"
          :class="member.connected ? 'text-gray-500' : ''"
      >{{ tags }}</span>
    </span>

    <template v-if="isHost">
      <label
          :for="selectId"
          class="sr-only"
      >
        Team van {{ member.name }}
      </label>
      <select
          :id="selectId"
          :value="teamIndex ?? ''"
          class="h-11 w-36 shrink-0 truncate rounded-xl border-2 bg-white px-2 font-semibold"
          @change="assign($event)"
      >
        <option
            v-if="allowUnassign || teamIndex === null"
            value=""
        >
          {{ teamIndex === null ? 'Kies team' : 'Geen team' }}
        </option>
        <option
            v-for="(team, index) in teams"
            :key="index"
            :value="index"
        >
          {{ team.name }}
        </option>
      </select>
      <RemoveButton
          v-if="!isYou"
          :can-remove="true"
          :label="`Haal ${member.name} uit de lobby`"
          @click="emit('kick', member.id)"
      />
      <!-- The host can't remove themselves; keep the button's space so every select lines up -->
      <span
          v-else
          class="size-10 shrink-0"
          aria-hidden="true"
      />
    </template>
  </li>
</template>

<script setup lang="ts">
import { computed, useId, type PropType } from "vue";
import RemoveButton from "~/components/RemoveButton.vue";
import type { MemberView } from "~/server/protocol";
import type { SavedGame } from "~/models/Game";

const props = defineProps({
  member: {
    type: Object as PropType<MemberView>,
    required: true,
  },
  teams: {
    type: Array as PropType<SavedGame['teams']>,
    required: true,
  },
  // Position in `teams` of the member's team; null without one
  teamIndex: {
    type: Number as PropType<number | null>,
    default: null,
  },
  isHost: {
    type: Boolean,
    required: true,
  },
  isYou: {
    type: Boolean,
    required: true,
  },
  hostId: {
    type: String as PropType<string | null>,
    default: null,
  },
  // In the lobby a player can go back to having no team; during a game a seat can only be filled
  allowUnassign: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits<{ assign: [playerId: string, teamIndex: number | null], kick: [playerId: string] }>();

const selectId = useId();

// " (jij) · host · weg", built as one string so the spacing doesn't depend on template whitespace
const tags = computed(() => {
  const parts = [
    props.isYou ? '(jij)' : '',
    props.member.id === props.hostId ? '· host' : '',
    props.member.connected ? '' : '· weg',
  ].filter(Boolean);

  return parts.length > 0 ? ` ${parts.join(' ')}` : '';
});

function assign(event: Event) {
  const value = (event.target as HTMLSelectElement).value;

  emit('assign', props.member.id, value === '' ? null : Number(value));
}
</script>
