import test from 'node:test';
import assert from 'node:assert/strict';
import { sleep } from './index.js';

test('sleep removes its abort listener after the timer completes', async () => {
  const controller = new AbortController();
  let listenerCount = 0;
  const add = controller.signal.addEventListener.bind(controller.signal);
  const remove = controller.signal.removeEventListener.bind(controller.signal);
  controller.signal.addEventListener = ((...args) => {
    if (args[0] === 'abort') listenerCount++;
    return add(...args);
  }) as typeof controller.signal.addEventListener;
  controller.signal.removeEventListener = ((...args) => {
    if (args[0] === 'abort') listenerCount--;
    return remove(...args);
  }) as typeof controller.signal.removeEventListener;

  await sleep(1, controller.signal);
  assert.equal(listenerCount, 0);
});

test('sleep removes its abort listener when cancelled', async () => {
  const controller = new AbortController();
  let listenerCount = 0;
  const add = controller.signal.addEventListener.bind(controller.signal);
  const remove = controller.signal.removeEventListener.bind(controller.signal);
  controller.signal.addEventListener = ((...args) => {
    if (args[0] === 'abort') listenerCount++;
    return add(...args);
  }) as typeof controller.signal.addEventListener;
  controller.signal.removeEventListener = ((...args) => {
    if (args[0] === 'abort') listenerCount--;
    return remove(...args);
  }) as typeof controller.signal.removeEventListener;

  const waiting = sleep(10_000, controller.signal);
  controller.abort();
  await waiting;
  assert.equal(listenerCount, 0);
});
