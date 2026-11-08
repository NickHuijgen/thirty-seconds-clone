<template>
  <!-- One root, so the parent's classes (position, colour) land here -->
  <div>
    <!-- Deliberately quiet: small and muted, so it's not tapped by accident, and it asks first -->
    <button
        type="button"
        class="flex h-11 items-center gap-1 px-3 text-sm font-semibold opacity-70"
        @click="dialog?.showModal()"
    >
      <span
          class="material-icons text-lg!"
          aria-hidden="true"
      >
        logout
      </span>
      Verlaat lobby
    </button>

    <!-- A native modal: traps focus, closes on Escape and with the back gesture's cancel event -->
    <dialog
        ref="dialog"
        class="m-auto w-[calc(100%-2rem)] max-w-sm rounded-3xl bg-white p-6 text-gray-900 shadow-2xl backdrop:bg-black/50"
        :aria-labelledby="titleId"
        @click="closeOnBackdrop"
    >
      <h2
          :id="titleId"
          class="text-xl font-extrabold"
      >
        Weet je het zeker?
      </h2>
      <p class="mt-2 text-gray-600">
        {{ inGame ? 'Je doet dan niet meer mee aan dit spel. Je kunt later opnieuw meedoen met de lobbycode.' : 'Je verlaat de lobby.' }}
      </p>
      <div class="mt-6 grid grid-cols-2 gap-3">
        <button
            type="button"
            class="h-12 rounded-2xl bg-gray-100 font-semibold"
            @click="dialog?.close()"
        >
          Blijven
        </button>
        <button
            type="button"
            class="h-12 rounded-2xl bg-red-700 font-semibold text-white"
            @click="leave()"
        >
          Verlaten
        </button>
      </div>
    </dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, useId } from "vue";

defineProps({
  // During a game leaving gives up a seat in a team, so the dialog says so
  inGame: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['leave']);

const dialog = ref<HTMLDialogElement | null>(null);
const titleId = useId();

function leave() {
  dialog.value?.close();
  emit('leave');
}

// A tap outside the dialog lands on the <dialog> element itself (its backdrop)
function closeOnBackdrop(event: MouseEvent) {
  if (event.target === dialog.value) {
    dialog.value?.close();
  }
}
</script>
