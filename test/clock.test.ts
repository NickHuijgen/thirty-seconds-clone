/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clockOffset, secondsLeft } from '../utils/clock.ts';

test('the offset comes from the ping with the shortest round trip', () => {
    // The server is 5000 ms ahead. The slow ping (400 ms, all of it on the way back) would be 200 ms off.
    const samples = [
        { t0: 1000, server: 6000, t1: 1400 },
        { t0: 2000, server: 7020, t1: 2040 },
        { t0: 3000, server: 8100, t1: 3300 },
    ];

    assert.equal(clockOffset(samples), 7020 - 2020);
    assert.equal(clockOffset([]), null);
});

test('a symmetric network gives the exact offset', () => {
    // 30 ms each way, server 1234 ms behind
    assert.equal(clockOffset([{ t0: 10_000, server: 10_000 + 30 - 1234, t1: 10_060 }]), -1234);
});

test('seconds left counts down in whole seconds against server time', () => {
    const endsAt = 100_000;
    const offset = 2000; // server ahead

    assert.equal(secondsLeft(endsAt, 100_000 - 2000 - 30_500, offset, 30), 30, 'the start delay shows a full ring');
    assert.equal(secondsLeft(endsAt, 100_000 - 2000 - 29_999, offset, 30), 30);
    assert.equal(secondsLeft(endsAt, 100_000 - 2000 - 29_000, offset, 30), 29);
    assert.equal(secondsLeft(endsAt, 100_000 - 2000 - 1, offset, 30), 1);
    assert.equal(secondsLeft(endsAt, 100_000 - 2000, offset, 30), 0);
    assert.equal(secondsLeft(endsAt, 200_000, offset, 30), 0, 'never negative');
});
