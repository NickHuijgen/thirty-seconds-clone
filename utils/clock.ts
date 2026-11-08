// Clock sync for online play: every phone counts down to the same server time (the turn's ends_at).
// No imports, so `node --test` runs it (test/clock.test.ts).

export interface ClockSample {
    // Phone time when the ping left
    t0: number;
    // Server time when it answered
    server: number;
    // Phone time when the answer arrived
    t1: number;
}

// How far the server's clock is ahead of this phone's, from the sample with the shortest round trip:
// the less time a message spent on the network, the less room for error in assuming it took half each way
export function clockOffset(samples: ClockSample[]): number | null {
    const best = [...samples].sort((a, b) => (a.t1 - a.t0) - (b.t1 - b.t0))[0];

    return best ? best.server - (best.t0 + best.t1) / 2 : null;
}

// Whole seconds left in the turn, for the timer ring: 30 while the start delay runs, 0 when it's over
export function secondsLeft(endsAt: number, phoneNow: number, offset: number, total: number): number {
    const remaining = endsAt - (phoneNow + offset);

    return Math.min(total, Math.max(0, Math.ceil(remaining / 1000)));
}
