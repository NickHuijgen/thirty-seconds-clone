import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './app.vue';
import Index from './pages/index.vue';
import GamePage from './pages/game.vue';
import './assets/css/main.css';

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        { path: '/', component: Index },
        { path: '/game', component: GamePage },
        { path: '/:pathMatch(.*)*', redirect: '/' },
    ],
});

createApp(App).use(router).mount('#app');
