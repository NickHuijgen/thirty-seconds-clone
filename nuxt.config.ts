// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite';

export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
  ssr: false,
  app: {
    head: {
      title: '30 Seconds',
      htmlAttrs: { lang: 'nl' },
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: 'favicon.svg' },
        { rel: 'apple-touch-icon', href: 'apple-touch-icon.png' },
        { rel: 'manifest', href: 'manifest.webmanifest' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Material+Icons' },
      ],
      meta: [
        { name: 'author', content: 'Nick Huijgen' },
        { name: 'theme-color', content: '#047857' },
        { name: 'apple-mobile-web-app-title', content: '30 Seconds' },
      ],
    },
    baseURL: '/thirty-seconds-clone/',
  }
})
