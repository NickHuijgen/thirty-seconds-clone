<template>
  <div
      v-if="canRemove"
      class="absolute right-1 top-2"
  >
    <span
        class="material-icons text-lg text-red-500 hover:text-red-600 cursor-pointer"
        title="Verwijder team"
        @click="handleClick()"
    >
      close
    </span>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits(['click']);

const props = defineProps({
  canRemove: {
    type: Boolean,
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
