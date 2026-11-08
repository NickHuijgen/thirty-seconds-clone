import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './app.vue';
import Index from './pages/index.vue';
import GamePage from './pages/game.vue';
import OnlinePage from './pages/online.vue';
import './assets/css/main.css';

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        { path: '/', component: Index },
        { path: '/game', component: GamePage },
        // /online/ABCD: a shareable link straight to a room
        { path: '/online/:code?', component: OnlinePage },
        { path: '/:pathMatch(.*)*', redirect: '/' },
    ],
});

createApp(App).use(router).mount('#app');

// Offline support: the service worker vite.config.ts builds into dist/sw.js. Never in development,
// where a stored copy of an old version would hide your changes.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
            .catch(error => console.log('Service worker registration failed:', error));
    });
}
