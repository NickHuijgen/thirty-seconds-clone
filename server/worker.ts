// The Worker in front of the site. It only runs for /api/* and /ws/* (`run_worker_first` in
// wrangler.jsonc); every other request is served straight from the static assets without it.
import { generateCode, normaliseCode } from './protocol.ts';

export { Room } from './Room.ts';

export default {
    async fetch(request, env): Promise<Response> {
        const url = new URL(request.url);

        // A new room, with a code nobody is using
        if (url.pathname === '/api/rooms' && request.method === 'POST') {
            for (let attempt = 0; attempt < 5; attempt++) {
                const code = generateCode(length => crypto.getRandomValues(new Uint8Array(length)));

                if (await roomFor(env, code).create(code)) {
                    return Response.json({ code });
                }
            }

            return Response.json({ error: 'Kon geen lobby maken' }, { status: 503 });
        }

        // A phone's connection to its room
        const socket = /^\/ws\/([^/]+)$/.exec(url.pathname);

        if (socket) {
            const code = normaliseCode(socket[1]!);

            if (!code) {
                return new Response('Lobby niet gevonden', { status: 404 });
            }

            if (request.headers.get('Upgrade') !== 'websocket') {
                return new Response('Verwacht een WebSocket', { status: 426 });
            }

            return roomFor(env, code).fetch(request);
        }

        if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/ws/')) {
            return new Response('Niet gevonden', { status: 404 });
        }

        // Only reached if run_worker_first ever sends more here: serve the site as usual
        return env.ASSETS.fetch(request);
    },
} satisfies ExportedHandler<Env>;

// One Durable Object per room; the code (already upper case) is its name
function roomFor(env: Env, code: string) {
    return env.ROOM.get(env.ROOM.idFromName(code));
}
