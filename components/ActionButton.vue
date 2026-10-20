<template>
  <!-- The big main button of a screen. Pass the colours as classes, e.g. class="bg-emerald-700 text-white". -->
  <button
      type="button"
      class="flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-semibold shadow-lg transition active:scale-[0.98]"
      @click="emit('click', $event)"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
const emit = defineEmits<{ click: [event: MouseEvent] }>();
</script>
