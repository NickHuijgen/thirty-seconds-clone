/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clockOffset, fractionLeft, secondsLeft } from '../utils/clock.ts';

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

test('the review bar drains smoothly from full to empty, against the server clock', () => {
    // Ends at server time 10 000 over 3000 ms; the phone's clock is 500 ms behind the server
    assert.equal(fractionLeft(10_000, 6_500, 500, 3000), 1, 'full at the start');
    assert.equal(fractionLeft(10_000, 8_000, 500, 3000), 0.5, 'not in whole seconds');
    assert.equal(fractionLeft(10_000, 9_200, 500, 3000), 0.1);
    assert.equal(fractionLeft(10_000, 9_500, 500, 3000), 0, 'empty at the end');
    assert.equal(fractionLeft(10_000, 20_000, 500, 3000), 0);
    assert.equal(fractionLeft(10_000, 0, 500, 3000), 1, 'never more than full');
});
