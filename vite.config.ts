/// <reference types="node" />
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { precacheFiles } from './pwa/precache.ts';

// Served from the root of thirty-seconds-clone.nickhuijgen.nl (wrangler.jsonc)
const BASE = '/';

// Writes dist/sw.js from pwa/service-worker.js: the list of files to store for offline play
// (pwa/precache.ts), and a version that changes whenever any of those files does
function serviceWorker(): Plugin {
    return {
        name: 'service-worker',
        apply: 'build',
        async closeBundle() {
            const dist = fileURLToPath(new URL('./dist/', import.meta.url));
            const entries = await readdir(dist, { recursive: true, withFileTypes: true });
            const files = precacheFiles(entries
                .filter(entry => entry.isFile())
                .map(entry => relative(dist, join(entry.parentPath, entry.name)).split(sep).join('/')));

            // The worker's own code counts too, so a change to it also gets a fresh cache
            const template = await readFile(fileURLToPath(new URL('./pwa/service-worker.js', import.meta.url)), 'utf8');
            const hash = createHash('sha256').update(template);
            for (const file of files) {
                hash.update(file);
                hash.update(await readFile(join(dist, file)));
            }

            const worker = template
                .replace("'__VERSION__'", JSON.stringify(hash.digest('hex').slice(0, 12)))
                .replace('__FILES__', JSON.stringify(files));
            await writeFile(join(dist, 'sw.js'), worker);
        },
    };
}

export default defineConfig({
    base: BASE,
    plugins: [
        vue(),
        tailwindcss(),
        serviceWorker(),
    ],
    resolve: {
        alias: {
            '~': fileURLToPath(new URL('./', import.meta.url)),
        },
    },
});
