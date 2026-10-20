// Offline support. Built into dist/sw.js by the serviceWorker plugin in vite.config.ts, which fills in
// VERSION and FILES; it doesn't run in development. Keep it plain JavaScript: it runs as a classic
// worker script, outside Vite's bundling.

const VERSION = '__VERSION__';
// Paths relative to this worker's URL, so relative to the site's base (/thirty-seconds-clone/)
const FILES = __FILES__;

const CACHE_PREFIX = 'thirty-seconds-';
const CACHE = `${CACHE_PREFIX}${VERSION}`;

// The cache holds exactly this version's files, one copy each. `ignoreVary`, because servers that send
// `Vary: Origin` would otherwise make the script, stylesheet and font (requested with `crossorigin`,
// so with an Origin header) miss the copy stored without one, and fail offline.
const MATCH = { cacheName: CACHE, ignoreVary: true };

// Store every file of this version. A new version (any changed file) installs next to the old one
// and only takes over once every open copy of the game is closed, so it never swaps mid-game.
self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
});

// Throw away older versions' files
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys
                .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE)
                .map(key => caches.delete(key))))
            .then(() => self.clients.claim()),
    );
});

// Answer from the stored files first, the network only for anything not stored
self.addEventListener('fetch', (event) => {
    const request = event.request;

    if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
        return;
    }

    // Every page (/, /game/, anything else) is the same app shell
    if (request.mode === 'navigate') {
        event.respondWith(caches.match('index.html', MATCH).then(cached => cached ?? fetch(request)));
        return;
    }

    event.respondWith(caches.match(request, MATCH).then(cached => cached ? withRange(request, cached) : fetch(request)));
});

// Audio is fetched in byte ranges, and Safari won't play a cached sound answered with the whole file,
// so cut the stored file to the range that was asked for
async function withRange(request, response) {
    const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') ?? '');

    if (!range || (range[1] === '' && range[2] === '')) {
        return response;
    }

    const body = await response.arrayBuffer();
    const size = body.byteLength;
    // "bytes=100-" (from 100), "bytes=100-199", or "bytes=-100" (the last 100)
    const start = range[1] === '' ? Math.max(size - Number(range[2]), 0) : Number(range[1]);
    const end = range[1] === '' || range[2] === '' ? size - 1 : Math.min(Number(range[2]), size - 1);

    if (start >= size || end < start) {
        return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    }

    return new Response(body.slice(start, end + 1), {
        status: 206,
        headers: {
            'Content-Type': response.headers.get('Content-Type') ?? 'application/octet-stream',
            'Content-Range': `bytes ${start}-${end}/${size}`,
            'Content-Length': String(end - start + 1),
            'Accept-Ranges': 'bytes',
        },
    });
}
