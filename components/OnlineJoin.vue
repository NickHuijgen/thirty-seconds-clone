<template>
  <div class="bg-linear-to-tr from-green-100 to-blue-200 text-gray-900">
    <Screen>
      <header class="mb-6">
        <h1 class="text-3xl font-extrabold">
          Online spelen
        </h1>
        <p class="mt-1 text-gray-600">
          Iedereen speelt op zijn eigen telefoon
        </p>
      </header>

      <div
          v-if="offline"
          class="rounded-2xl bg-white p-4 shadow-sm"
          role="alert"
      >
        <p class="font-semibold">
          Online spelen heeft internet nodig
        </p>
        <p class="mt-1 text-gray-600">
          Zonder verbinding kun je wel op één telefoon spelen.
        </p>
      </div>

      <form
          v-else
          class="space-y-6"
          @submit.prevent="submit()"
      >
        <div>
          <label
              :for="`${id}-name`"
              class="mb-1 block font-semibold"
          >
            Je naam
          </label>
          <input
              v-model="name"
              type="text"
              :id="`${id}-name`"
              autocomplete="nickname"
              :maxlength="MAX_NAME_LENGTH"
              class="h-12 w-full rounded-xl border-2 bg-white px-3 text-lg font-semibold"
          >
        </div>

        <div>
          <label
              :for="`${id}-code`"
              class="mb-1 block font-semibold"
          >
            Lobbycode
          </label>
          <input
              v-model="code"
              type="text"
              :id="`${id}-code`"
              autocomplete="off"
              autocapitalize="characters"
              spellcheck="false"
              :maxlength="CODE_LENGTH"
              placeholder="ABCD"
              :aria-describedby="`${id}-code-hint`"
              class="h-12 w-full rounded-xl border-2 bg-white px-3 text-lg font-bold tracking-[0.3em] uppercase"
          >
          <p
              :id="`${id}-code-hint`"
              class="mt-1 text-sm text-gray-600"
          >
            Laat leeg om zelf een lobby te maken
          </p>
        </div>

        <!-- So Enter on the keyboard submits too -->
        <button
            type="submit"
            class="sr-only"
            tabindex="-1"
        >
          {{ actionLabel }}
        </button>
      </form>

      <p
          v-if="error"
          class="mt-6 rounded-2xl bg-red-50 p-4 font-semibold text-red-800"
          role="alert"
      >
        {{ error }}
      </p>

      <RouterLink
          to="/game"
          class="mt-auto flex h-12 items-center justify-center pt-6 font-semibold text-gray-700 underline"
      >
        Speel op één telefoon
      </RouterLink>

      <template
          v-if="!offline"
          #action
      >
        <ActionButton
            class="bg-emerald-700 text-white"
            @click="submit()"
        >
          {{ busy ? 'Even geduld…' : actionLabel }}
        </ActionButton>
      </template>
    </Screen>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useId, type PropType } from "vue";
import Screen from "~/components/Screen.vue";
import ActionButton from "~/components/ActionButton.vue";
import { CODE_LENGTH, MAX_NAME_LENGTH, normaliseCode } from "~/server/protocol";
import { usePageColour } from "~/composables/usePageColour";
import { PAGE_SETUP } from "~/utils/teamColours";

const props = defineProps({
  initialCode: {
    type: String,
    default: '',
  },
  initialName: {
    type: String,
    default: '',
  },
  busy: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String as PropType<string | null>,
    default: null,
  },
});

const emit = defineEmits<{ submit: [name: string, code: string | null], invalid: [message: string] }>();

const id = useId();
const name = ref(props.initialName);
const code = ref(props.initialCode);
const offline = ref(typeof navigator !== 'undefined' && navigator.onLine === false);

const actionLabel = computed(() => code.value.trim() ? 'Doe mee' : 'Maak een lobby');

usePageColour(() => PAGE_SETUP);

function submit() {
  if (props.busy) {
    return;
  }

  if (!name.value.trim()) {
    emit('invalid', 'Vul je naam in');

    return;
  }

  const typed = code.value.trim();
  const normalised = normaliseCode(typed);

  if (typed && !normalised) {
    emit('invalid', 'Een lobbycode is 4 letters of cijfers');

    return;
  }

  emit('submit', name.value.trim(), normalised);
}

function updateOnline() {
  offline.value = navigator.onLine === false;
}

onMounted(() => {
  window.addEventListener('online', updateOnline);
  window.addEventListener('offline', updateOnline);
});

onUnmounted(() => {
  window.removeEventListener('online', updateOnline);
  window.removeEventListener('offline', updateOnline);
});
</script>
