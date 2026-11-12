<template>
  <!-- One root, so the parent's classes (position, colour) land here -->
  <div>
    <!-- Deliberately quiet: small and muted, so it's not tapped by accident, and it asks first -->
    <button
        type="button"
        class="flex h-11 items-center gap-1 px-3 text-sm font-semibold opacity-70"
        @click="dialog?.open()"
    >
      <span
          class="material-icons text-lg!"
          aria-hidden="true"
      >
        logout
      </span>
      Verlaat lobby
    </button>

    <ConfirmDialog
        ref="dialog"
        :message="inGame ? 'Je doet dan niet meer mee aan dit spel. Je kunt later opnieuw meedoen met de lobbycode.' : 'Je verlaat de lobby.'"
        cancel-label="Blijven"
        confirm-label="Verlaten"
        @confirm="emit('leave')"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import ConfirmDialog from "~/components/ConfirmDialog.vue";

defineProps({
  // During a game leaving gives up a seat in a team, so the dialog says so
  inGame: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['leave']);

const dialog = ref<InstanceType<typeof ConfirmDialog> | null>(null);
</script>
