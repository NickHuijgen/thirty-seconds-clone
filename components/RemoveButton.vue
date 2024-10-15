<template>
  <div class="absolute right-1 top-0.5">
    <span
        class="material-icons text-sm"
        :class="{
          'cursor-not-allowed text-gray-500': !canRemove,
          'text-red-500 hover:text-red-600 cursor-pointer': canRemove,
        }"
        title="Verwijder team"
        @click="handleClick()"
    >
      close
    </span>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits(['click']);

defineProps({
  canRemove: {
    type: Boolean,
    required: true,
  },
});

function handleClick() {
  if (!canRemove) {
    return;
  }

  emit('click');
}
</script>

<style scoped>

</style>
