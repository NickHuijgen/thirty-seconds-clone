<template>
  <div
      v-if="canRemove"
      class="absolute right-2 top-2"
  >
    <button
        type="button"
        class="flex p-2 -m-2 text-red-500 hover:text-red-600 cursor-pointer"
        :title="label"
        :aria-label="label"
        @click="handleClick()"
    >
      <span
          class="material-icons text-lg"
          aria-hidden="true"
      >
        close
      </span>
    </button>
  </div>
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

<style scoped>

</style>
