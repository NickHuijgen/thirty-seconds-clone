<template>
  <div class="absolute right-1 top-0.5">
    <span
        class="material-icons text-sm cursor-pointer text-red-500"
        title="Verwijder team"
        @click="$emit('click')"
    >
      close
    </span>
  </div>
</template>

<script setup lang="ts">
defineEmits(['click']);
</script>

<style scoped>

</style>
