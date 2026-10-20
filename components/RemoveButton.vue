<template>
  <!-- Position it from the parent, e.g. class="absolute right-2 top-2" -->
  <button
      v-if="canRemove"
      type="button"
      class="flex size-10 items-center justify-center rounded-full text-red-500 hover:text-red-600"
      :title="label"
      :aria-label="label"
      @click="handleClick()"
  >
    <span
        class="material-icons text-xl!"
        aria-hidden="true"
    >
      close
    </span>
  </button>
</template>

<script setup lang="ts">
const emit = defineEmits(['click']);

const props = defineProps({
  canRemove: {
    type: Boolean,
    required: true,
  },

  label: {
    type: String,
    required: true,
  },
});

function handleClick() {
  if (!props.canRemove) {
    return;
  }

  emit('click');
}
</script>
