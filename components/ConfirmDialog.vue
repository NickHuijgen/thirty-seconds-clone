<template>
  <!-- A native modal: traps focus, closes on Escape and with the back gesture's cancel event.
       Open it from the parent through a template ref: dialog.value?.open().
       The focus outline is forced back to emerald: on a coloured screen the root turns it white,
       which would vanish against the white dialog. -->
  <dialog
      ref="dialog"
      class="m-auto w-[calc(100%-2rem)] max-w-sm rounded-3xl bg-white p-6 text-left text-base font-normal text-gray-900 shadow-2xl backdrop:bg-black/50 [&_:focus-visible]:outline-emerald-700!"
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
      {{ message }}
    </p>
    <div class="mt-6 grid grid-cols-2 gap-3">
      <button
          type="button"
          class="h-12 rounded-2xl bg-gray-100 font-semibold"
          @click="dialog?.close()"
      >
        {{ cancelLabel }}
      </button>
      <button
          type="button"
          class="h-12 rounded-2xl bg-red-700 font-semibold text-white"
          @click="confirm()"
      >
        {{ confirmLabel }}
      </button>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { ref, useId } from "vue";

defineProps({
  message: {
    type: String,
    required: true,
  },
  confirmLabel: {
    type: String,
    required: true,
  },
  cancelLabel: {
    type: String,
    default: 'Annuleren',
  },
});

const emit = defineEmits(['confirm']);

const dialog = ref<HTMLDialogElement | null>(null);
const titleId = useId();

function open() {
  dialog.value?.showModal();
}

function confirm() {
  dialog.value?.close();
  emit('confirm');
}

// A tap outside the dialog lands on the <dialog> element itself (its backdrop)
function closeOnBackdrop(event: MouseEvent) {
  if (event.target === dialog.value) {
    dialog.value?.close();
  }
}

defineExpose({ open });
</script>
