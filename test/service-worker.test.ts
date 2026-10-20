/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { precacheFiles } from '../pwa/precache.ts';

// What `vite build` produces (hashes vary per build)
const BUILT = [
    '404.html',
    'apple-touch-icon.png',
    'assets/index-BAbGcPBa.js',
    'assets/index-DnzTvv3w.css',
    'assets/turn-start-nn-w_bNA.mp3',
    'assets/vine-boom-DkqjqdHy.mp3',
    'brands.json',
    'favicon.svg',
    'fonts/material-icons.woff2',
    'game/index.html',
    'icon-192.png',
    'icon-512.png',
    'index.html',
    'manifest.webmanifest',
    'media.json',
    'people.json',
    'places.json',
    'robots.txt',
    'sounds/turn-start.mp3',
    'sounds/vine-boom.mp3',
    'sw.js',
    'wildcards.json',
];

test('the service worker stores everything the app loads', () => {
    assert.deepEqual(precacheFiles(BUILT), [
        'apple-touch-icon.png',
        'assets/index-BAbGcPBa.js',
        'assets/index-DnzTvv3w.css',
        'assets/turn-start-nn-w_bNA.mp3',
        'assets/vine-boom-DkqjqdHy.mp3',
        'favicon.svg',
        'fonts/material-icons.woff2',
        'icon-192.png',
        'icon-512.png',
        'index.html',
        'manifest.webmanifest',
    ]);
});

test('a new asset is stored without changing the list', () => {
    assert.ok(precacheFiles([...BUILT, 'assets/chunk-abc123.js', 'images/team.png']).includes('assets/chunk-abc123.js'));
    assert.ok(precacheFiles([...BUILT, 'images/team.png']).includes('images/team.png'));
});

// The worker template, as vite.config.ts fills it in
const template = readFileSync(new URL('../pwa/service-worker.js', import.meta.url), 'utf8');

test('the worker template has each placeholder exactly once', () => {
    assert.equal(template.split("'__VERSION__'").length - 1, 1);
    assert.equal(template.split('__FILES__').length - 1, 1);
});

// Runs the real worker script with just enough of a worker global to get at withRange()
function loadWorker() {
    const context = createContext({
        self: { addEventListener() {}, location: { origin: 'https://example.test' } },
        Response,
        URL,
    });
    runInContext(template.replace("'__VERSION__'", '"test"').replace('__FILES__', '[]'), context);

    return context as unknown as { withRange(request: Request, response: Response): Promise<Response> };
}

const { withRange } = loadWorker();
const file = new Uint8Array(Array.from({ length: 100 }, (_, i) => i));
const stored = () => new Response(file, { headers: { 'Content-Type': 'audio/mpeg' } });
const ask = (range?: string) => new Request('https://example.test/a.mp3', { headers: range ? { range } : {} });

test('a normal request gets the whole stored file', async () => {
    const response = await withRange(ask(), stored());

    assert.equal(response.status, 200);
    assert.equal((await response.arrayBuffer()).byteLength, 100);
});

test('a range request gets exactly that range, as 206', async () => {
    const response = await withRange(ask('bytes=10-19'), stored());

    assert.equal(response.status, 206);
    assert.equal(response.headers.get('Content-Range'), 'bytes 10-19/100');
    assert.equal(response.headers.get('Content-Length'), '10');
    assert.equal(response.headers.get('Content-Type'), 'audio/mpeg');
    assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
});

test('open-ended, suffix and Safari\'s first probe ranges', async () => {
    assert.equal((await withRange(ask('bytes=90-'), stored())).headers.get('Content-Range'), 'bytes 90-99/100');
    assert.equal((await withRange(ask('bytes=-5'), stored())).headers.get('Content-Range'), 'bytes 95-99/100');
    assert.equal((await withRange(ask('bytes=0-1'), stored())).headers.get('Content-Range'), 'bytes 0-1/100');
    assert.equal((await withRange(ask('bytes=50-500'), stored())).headers.get('Content-Range'), 'bytes 50-99/100');
});

test('a range outside the file is a 416', async () => {
    const response = await withRange(ask('bytes=200-300'), stored());

    assert.equal(response.status, 416);
    assert.equal(response.headers.get('Content-Range'), 'bytes */100');
});
