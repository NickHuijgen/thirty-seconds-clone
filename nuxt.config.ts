// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
  app: {
    head: {
      title: '30 Seconds',
    },
    baseURL: '/thirty-seconds-clone/',
    meta: [
      { name: 'author', content: 'Nick Huijgen' },
    ],
  }
})
