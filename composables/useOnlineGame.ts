import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue';
import Game, { TURN_SECONDS } from '~/models/Game';
import { clockOffset, secondsLeft, type ClockSample } from '~/utils/clock';
import {
    CLOSE_KICKED, CLOSE_LEFT, CLOSE_ROOM_GONE, type ClientMessage, type RoomView, type ServerMessage,
} from '~/server/protocol';

// Where this phone remembers its seat, so a refresh or a locked screen puts it back in the room.
// Separate from the one-phone saved game (STORAGE_KEY), which online play never touches.
export const SESSION_KEY = 'thirty-seconds-online';

interface Session {
    code: string;
    playerId: string;
    name: string;
}

const PINGS_PER_SYNC = 5;
const RESYNC_EVERY = 30_000;
const MAX_RETRY_DELAY = 10_000;

export function readSession(): Session | null {
    try {
        const session = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null');

        return session && typeof session.code === 'string' && typeof session.playerId === 'string' ? session : null;
    } catch {
        return null;
    }
}

function writeSession(session: Session): void {
    try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
        // Private mode: playing works, a refresh just asks for the name again
    }
}

function clearSession(): void {
    try {
        localStorage.removeItem(SESSION_KEY);
    } catch {
        // Nothing stored
    }
}

// Asks the server for a new room and returns its code
export async function createRoom(): Promise<string> {
    const response = await fetch('/api/rooms', { method: 'POST' });

    if (!response.ok) {
        throw new Error(`Status ${response.status}`);
    }

    return (await response.json()).code;
}

// One phone's connection to an online room. The server decides everything; this keeps the latest state,
// turns it into a Game for the existing screens, and counts the timer down against the server's clock.
export function useOnlineGame() {
    const state = shallowRef<RoomView | null>(null);
    const playerId = ref<string | null>(null);
    // 'connecting' until the first welcome; 'reconnecting' while a lost connection is being restored
    const status = ref<'idle' | 'connecting' | 'connected' | 'reconnecting'>('idle');
    // A message from the server or about the connection, in Dutch
    const error = ref<string | null>(null);
    // The game the screens show. Rebuilt from every state; the countdown updates its turn_timer in place.
    const game = ref<Game>(new Game(25, Game.emptyWordLists()));

    let socket: WebSocket | null = null;
    let code = '';
    let name = '';
    let retries = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let syncTimer: ReturnType<typeof setInterval> | undefined;
    let tickTimer: ReturnType<typeof setInterval> | undefined;
    let errorTimer: ReturnType<typeof setTimeout> | undefined;
    // The words of the describer's running turn: only their phone ever gets these
    let turnWords: { turn: number, words: string[] } | null = null;
    let offset = 0;
    let samples: ClockSample[] = [];

    const isHost = computed(() => !!state.value && state.value.host_id === playerId.value);
    const isDescriber = computed(() => !!state.value && state.value.describer_id === playerId.value);

    function connect(roomCode: string, playerName: string): void {
        code = roomCode;
        name = playerName;
        retries = 0;
        status.value = 'connecting';
        open();
    }

    function open(): void {
        clearTimeout(retryTimer);
        socket?.close();

        const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
        const ws = new WebSocket(`${protocol}://${location.host}/ws/${code}`);
        socket = ws;

        ws.addEventListener('open', () => {
            const session = readSession();
            send({ type: 'join', name, playerId: session?.code === code ? session.playerId : undefined });
            syncClock();
        });

        ws.addEventListener('message', (event) => {
            try {
                receive(JSON.parse(event.data));
            } catch (error) {
                console.log('Bad message from the server:', error);
            }
        });

        ws.addEventListener('close', (event) => {
            if (socket !== ws) {
                return;
            }
            socket = null;

            // Left the room in another tab: this one is out too, quietly
            if (event.code === CLOSE_LEFT) {
                reset(null);

                return;
            }

            // The room is gone or the host removed this player: start over
            if (event.code === CLOSE_ROOM_GONE || event.code === CLOSE_KICKED) {
                reset(event.reason || 'De verbinding met de lobby is verbroken');

                return;
            }

            // Never got in (no internet, wrong address): say so instead of retrying forever
            if (status.value === 'connecting') {
                reset(navigator.onLine === false
                    ? 'Online spelen heeft internet nodig'
                    : 'Geen verbinding met de lobby. Probeer het opnieuw.');

                return;
            }

            if (status.value !== 'idle') {
                status.value = 'reconnecting';
                retryTimer = setTimeout(open, Math.min(MAX_RETRY_DELAY, 500 * 2 ** retries++));
            }
        });
    }

    function receive(message: ServerMessage): void {
        switch (message.type) {
            case 'welcome':
                playerId.value = message.playerId;
                status.value = 'connected';
                retries = 0;
                writeSession({ code, playerId: message.playerId, name });
                setState(message.state);
                break;

            case 'state':
                setState(message.state);
                break;

            case 'words':
                turnWords = { turn: message.turn, words: message.words };
                rebuild();
                break;

            case 'pong':
                samples.push({ t0: message.t0, server: message.server, t1: Date.now() });
                if (samples.length < PINGS_PER_SYNC) {
                    send({ type: 'ping', t0: Date.now() });
                } else {
                    offset = clockOffset(samples) ?? offset;
                    tick();
                }
                break;

            case 'error':
                showError(message.message);
                break;
        }
    }

    function setState(next: RoomView): void {
        state.value = next;
        rebuild();
    }

    // A Game the existing screens can show, from what the server sent
    function rebuild(): void {
        const view = state.value;

        if (!view) {
            return;
        }

        const next = Game.fromSaved(view.game, Game.emptyWordLists());
        next.last_turn = view.last_turn;
        next.is_applying_score = view.is_applying_score;
        next.active_words = view.active_words.length > 0 || turnWords?.turn !== view.turn
            ? view.active_words
            : turnWords.words;
        next.turn_timer = view.ends_at === null ? 0 : secondsLeft(view.ends_at, Date.now(), offset, TURN_SECONDS);
        game.value = next;
        tick();
    }

    // The countdown: whole seconds against the server's clock. The server ends the turn itself; when the
    // ring reaches 0 first, the scoring screen shows straight away and the server's state follows.
    function tick(): void {
        const endsAt = state.value?.ends_at;

        if (endsAt === null || endsAt === undefined) {
            return;
        }

        const seconds = secondsLeft(endsAt, Date.now(), offset, TURN_SECONDS);

        if (game.value.turn_timer !== seconds) {
            game.value.turn_timer = seconds;
        }

        if (seconds === 0 && !game.value.is_applying_score) {
            game.value.is_applying_score = true;
        }
    }

    function syncClock(): void {
        samples = [];
        send({ type: 'ping', t0: Date.now() });
    }

    function send(message: ClientMessage): void {
        if (socket?.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(message));
        }
    }

    function showError(message: string): void {
        error.value = message;
        clearTimeout(errorTimer);
        errorTimer = setTimeout(() => error.value = null, 4000);
    }

    // Back to the join screen, with a reason
    function reset(reason: string | null): void {
        clearSession();
        clearTimeout(retryTimer);
        status.value = 'idle';
        state.value = null;
        playerId.value = null;
        turnWords = null;
        error.value = reason;
        clearTimeout(errorTimer);
    }

    // Out of the room for good: the server gives the seat up, so the game never waits for this player.
    // The message goes out before the socket closes.
    function leave(): void {
        send({ type: 'leave' });
        status.value = 'idle';
        const ws = socket;
        socket = null;
        ws?.close();
        reset(null);
    }

    // A phone coming back from a locked screen, or back online, reconnects now instead of after the backoff
    function reconnectNow(): void {
        if (status.value === 'reconnecting' || (status.value === 'connected' && socket?.readyState !== WebSocket.OPEN)) {
            retries = 0;
            status.value = 'reconnecting';
            open();
        }
    }

    function onVisibilityChange(): void {
        if (document.visibilityState === 'visible') {
            reconnectNow();
        }
    }

    onMounted(() => {
        tickTimer = setInterval(tick, 200);
        syncTimer = setInterval(() => {
            if (socket?.readyState === WebSocket.OPEN) {
                syncClock();
            }
        }, RESYNC_EVERY);
        window.addEventListener('online', reconnectNow);
        document.addEventListener('visibilitychange', onVisibilityChange);
    });

    onUnmounted(() => {
        clearInterval(tickTimer);
        clearInterval(syncTimer);
        clearTimeout(retryTimer);
        clearTimeout(errorTimer);
        window.removeEventListener('online', reconnectNow);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        status.value = 'idle';
        const ws = socket;
        socket = null;
        ws?.close();
    });

    return { state, game, playerId, status, error, isHost, isDescriber, connect, send, leave, showError };
}
