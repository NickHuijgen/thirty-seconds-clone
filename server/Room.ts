// One online room: a Durable Object per room code (server/worker.ts). A thin layer around
// server/rules.ts: it stores the room, holds the phones' WebSockets and sends what the rules decide.
// The game's timing lives here too: an alarm ends the turn, whether or not any phone is still open.
import { DurableObject } from 'cloudflare:workers';
import { words } from '../utils/words.ts';
import { CLOSE_KICKED, CLOSE_LEFT, CLOSE_ROOM_GONE, type ServerMessage } from './protocol.ts';
import {
    createRoom, disconnect, handle, isExpired, join, messagesFor, nextAlarm, parseMessage, settle, view,
    type RoomData,
} from './rules.ts';

interface Attachment {
    playerId: string | null;
}

export class Room extends DurableObject<Env> {
    // Memory is wiped whenever the object hibernates between messages, so this is only a cache of storage
    private room: RoomData | null | undefined;

    private async load(): Promise<RoomData | null> {
        if (this.room === undefined) {
            this.room = (await this.ctx.storage.get<RoomData>('room')) ?? null;
        }

        return this.room;
    }

    private async store(room: RoomData): Promise<void> {
        await this.ctx.storage.put('room', room);
        await this.ctx.storage.setAlarm(nextAlarm(room));
    }

    // Called by the Worker for a freshly generated code; false if that code is already taken
    async create(code: string): Promise<boolean> {
        if (await this.load()) {
            return false;
        }

        this.room = createRoom(code, Date.now(), words);
        await this.store(this.room);

        return true;
    }

    async fetch(request: Request): Promise<Response> {
        if (request.headers.get('Upgrade') !== 'websocket') {
            return new Response('Verwacht een WebSocket', { status: 426 });
        }

        const [client, server] = Object.values(new WebSocketPair()) as [WebSocket, WebSocket];
        // Hibernation: the object can sleep between messages while the connection stays open
        this.ctx.acceptWebSocket(server);
        server.serializeAttachment({ playerId: null } satisfies Attachment);

        return new Response(null, { status: 101, webSocket: client });
    }

    async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
        const message = typeof raw === 'string' ? parseMessage(raw) : null;

        if (!message) {
            return;
        }

        // Clock sync answers straight away, without touching storage
        if (message.type === 'ping') {
            send(ws, { type: 'pong', t0: Number(message.t0), server: Date.now() });

            return;
        }

        const room = await this.load();

        if (!room) {
            send(ws, { type: 'error', message: 'Lobby niet gevonden' });
            ws.close(CLOSE_ROOM_GONE, 'Lobby niet gevonden');

            return;
        }

        const now = Date.now();
        const { playerId } = ws.deserializeAttachment() as Attachment;

        if (message.type === 'join') {
            const result = join(room, message.name, message.playerId ?? playerId, now, () => crypto.randomUUID());

            if (result.error || !result.playerId) {
                send(ws, { type: 'error', message: result.error ?? 'Meedoen lukte niet' });

                return;
            }

            ws.serializeAttachment({ playerId: result.playerId } satisfies Attachment);
            settle(room, now, words);
            await this.store(room);
            send(ws, { type: 'welcome', playerId: result.playerId, state: view(room, now) });
            this.broadcast(room, now);

            return;
        }

        if (!playerId) {
            return;
        }

        const result = handle(room, playerId, message, now, words);

        if (result.error) {
            send(ws, { type: 'error', message: result.error });
        }

        if (result.kicked) {
            for (const socket of this.socketsOf(result.kicked)) {
                send(socket, { type: 'error', message: 'Je bent uit de lobby gehaald' });
                socket.serializeAttachment({ playerId: null } satisfies Attachment);
                socket.close(CLOSE_KICKED, 'Uit de lobby gehaald');
            }
        }

        if (result.left) {
            // Every tab of theirs, so none of them reconnects into a seat that's gone
            for (const socket of this.socketsOf(result.left)) {
                socket.serializeAttachment({ playerId: null } satisfies Attachment);
                socket.close(CLOSE_LEFT, 'Lobby verlaten');
            }
        }

        if (result.changed) {
            await this.store(room);
            this.broadcast(room, now);
        }

        if (result.notice) {
            for (const socket of this.ctx.getWebSockets()) {
                send(socket, { type: 'error', message: result.notice });
            }
        }
    }

    async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
        await this.closed(ws);

        try {
            ws.close(code, reason);
        } catch {
            // Already closed
        }
    }

    async webSocketError(ws: WebSocket): Promise<void> {
        await this.closed(ws);
    }

    private async closed(ws: WebSocket): Promise<void> {
        const { playerId } = ws.deserializeAttachment() as Attachment;
        const room = await this.load();

        if (!room || !playerId) {
            return;
        }

        const stillConnected = this.socketsOf(playerId).some(socket => socket !== ws);

        if (disconnect(room, playerId, stillConnected)) {
            await this.store(room);
            this.broadcast(room, Date.now());
        }
    }

    // The end of a turn, or the end of the room
    async alarm(): Promise<void> {
        const room = await this.load();

        if (!room) {
            return;
        }

        const now = Date.now();

        if (isExpired(room, now)) {
            for (const socket of this.ctx.getWebSockets()) {
                send(socket, { type: 'error', message: 'Deze lobby is verlopen' });
                socket.close(CLOSE_ROOM_GONE, 'Lobby verlopen');
            }
            await this.ctx.storage.deleteAlarm();
            await this.ctx.storage.deleteAll();
            this.room = null;

            return;
        }

        const changed = settle(room, now, words);
        await this.store(room);

        if (changed) {
            this.broadcast(room, now);
        }
    }

    private socketsOf(playerId: string): WebSocket[] {
        return this.ctx.getWebSockets().filter(socket => (socket.deserializeAttachment() as Attachment | null)?.playerId === playerId);
    }

    private broadcast(room: RoomData, now: number): void {
        for (const socket of this.ctx.getWebSockets()) {
            const { playerId } = (socket.deserializeAttachment() as Attachment | null) ?? { playerId: null };

            if (playerId) {
                messagesFor(room, playerId, now).forEach(message => send(socket, message));
            }
        }
    }
}

function send(ws: WebSocket, message: ServerMessage): void {
    try {
        ws.send(JSON.stringify(message));
    } catch {
        // The connection closed in the meantime; webSocketClose cleans up
    }
}
