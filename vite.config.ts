/// <reference types="node" />
import { copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages serves the site from /<repo-name>/
const BASE = '/thirty-seconds-clone/';

// GitHub Pages has no SPA fallback. Copy the app shell to every route's own index.html,
// so reloading /game works, and to 404.html for anything else.
const ROUTES = ['game'];

function spaShells(): Plugin {
    return {
        name: 'spa-shells',
        apply: 'build',
        async closeBundle() {
            const index = fileURLToPath(new URL('./dist/index.html', import.meta.url));
            for (const route of ROUTES) {
                const dir = fileURLToPath(new URL(`./dist/${route}/`, import.meta.url));
                await mkdir(dir, { recursive: true });
                await copyFile(index, `${dir}index.html`);
            }
            await copyFile(index, fileURLToPath(new URL('./dist/404.html', import.meta.url)));
        },
    };
}

export default defineConfig({
    base: BASE,
    plugins: [
        vue(),
        tailwindcss(),
        spaShells(),
    ],
    resolve: {
        alias: {
            '~': fileURLToPath(new URL('./', import.meta.url)),
        },
    },
});
