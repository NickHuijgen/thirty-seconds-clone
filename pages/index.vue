<template>
  <div class="h-screen w-full bg-gradient-to-tr from-red-100 to-blue-200 flex justify-center">
    <div class="my-auto">
      <p class="font-bold text-center text-xl p-4">
        Welkom bij 30 seconden!
      </p>

      <p class="font-bold text-center text-gray-500 p-4">
        Ben je klaar om te spelen?
      </p>

      <div class="flex justify-center items-center p-4">
        <button
            type="button"
            class="px-8 py-3 font-semibold rounded bg-gradient-to-br text-white shadow-2xl hover:bg-gradient-to-tr from-emerald-600 to-emerald-800"
            @click="startGame()"
        >
          Begin spel
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
function startGame() {
  console.log('Game started');
}
</script>

<style scoped>

</style>
