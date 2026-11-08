/// <reference types="node" />
import { spawn, type ChildProcess } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { precacheFiles } from './pwa/precache.ts';

// Served from the root of thirty-seconds-clone.nickhuijgen.nl (wrangler.jsonc)
const BASE = '/';

// Online play in `npm run dev`: the Worker (server/) runs next to Vite in `wrangler dev`, and Vite
// forwards /api and /ws to it, so the page and its WebSocket share one origin, like in production
const WORKER_PORT = 8787;

function workerDev(): Plugin {
    let worker: ChildProcess | undefined;

    return {
        name: 'worker-dev',
        apply: 'serve',
        async configureServer(server) {
            // wrangler refuses to start without the assets directory, even though Vite serves the page here
            await mkdir(fileURLToPath(new URL('./dist/', import.meta.url)), { recursive: true });

            worker = spawn('npx', ['wrangler', 'dev', '--port', String(WORKER_PORT), '--show-interactive-dev-session=false'], {
                stdio: ['ignore', 'inherit', 'inherit'],
            });
            const stop = () => worker?.kill();
            server.httpServer?.on('close', stop);
            process.on('exit', stop);
        },
    };
}

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
        workerDev(),
    ],
    server: {
        proxy: {
            '/api/': `http://localhost:${WORKER_PORT}`,
            '/ws/': { target: `ws://localhost:${WORKER_PORT}`, ws: true },
        },
    },
    resolve: {
        alias: {
            '~': fileURLToPath(new URL('./', import.meta.url)),
        },
    },
});
