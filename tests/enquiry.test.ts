import assert from 'node:assert/strict';
import test from 'node:test';
import { sendEnquiry, type Enquiry } from '../src/lib/enquiry.ts';

const endpoint = 'https://api.web3forms.com/submit';
const enquiry: Enquiry = {
  access_key: '12345678-1234-4123-8123-123456789abc',
  Jméno: 'Žofie Nováková',
  email: 'visitor@example.com',
  Zpráva: 'Skleněné dveře, prosím.',
  botcheck: false,
  subject: 'SKLOSERVIS-BROD: Nezávazná poptávka',
};

test('relay acceptance requires explicit true and sends one JSON payload without extra recipients', async (t) => {
  const fetch = t.mock.method(
    globalThis,
    'fetch',
    async (url: RequestInfo | URL, options?: RequestInit) => {
      assert.equal(url, endpoint);
      assert.equal(options?.method, 'POST');
      assert.equal(options?.redirect, 'error');
      assert.equal(options?.credentials, 'omit');
      assert.deepEqual(options?.headers, {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      });
      assert.deepEqual(JSON.parse(String(options?.body)), enquiry);
      assert.ok(options?.signal instanceof AbortSignal);
      return Response.json({ success: true });
    },
  );
  await sendEnquiry(endpoint, enquiry, new AbortController().signal);
  assert.equal(fetch.mock.callCount(), 1);
  fetch.mock.restore();
});

test('HTTP errors, HTML, malformed JSON and ambiguous success never confirm acceptance', async (t) => {
  const responses = [
    Response.json({ success: true }, { status: 500 }),
    new Response('<h1>Thank you</h1>'),
    new Response('{"success":'),
    ...[
      null,
      [],
      {},
      { success: false },
      { success: 'true' },
      { success: 'false' },
      { success: 1 },
    ].map((body) => Response.json(body)),
  ];
  const original = structuredClone(enquiry);
  for (const response of responses) {
    const fetch = t.mock.method(globalThis, 'fetch', async () => response);
    await assert.rejects(sendEnquiry(endpoint, enquiry, new AbortController().signal));
    assert.deepEqual(enquiry, original);
    fetch.mock.restore();
  }
});

test('network failures and aborted or timed-out requests reject without retrying', async (t) => {
  const fetch = t.mock.method(
    globalThis,
    'fetch',
    async (_url: RequestInfo | URL, options?: RequestInit) => {
      const signal = options?.signal;
      assert.ok(signal);
      return new Promise<Response>((_resolve, reject) => {
        if (signal.aborted) reject(signal.reason);
        else signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      });
    },
  );
  const controller = new AbortController();
  const pending = sendEnquiry(endpoint, enquiry, controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });

  // AbortSignal.timeout uses an unreferenced timer; keep this test alive until it fires.
  const keepAlive = setTimeout(() => {}, 1000);
  try {
    await assert.rejects(sendEnquiry(endpoint, enquiry, AbortSignal.timeout(10)), {
      name: 'TimeoutError',
    });
  } finally {
    clearTimeout(keepAlive);
  }
  assert.equal(fetch.mock.callCount(), 2);
  fetch.mock.restore();

  const network = t.mock.method(globalThis, 'fetch', async () => {
    throw new TypeError('Network request failed');
  });
  await assert.rejects(sendEnquiry(endpoint, enquiry, new AbortController().signal), TypeError);
  assert.equal(network.mock.callCount(), 1);
});

test('submission works without the newer AbortSignal static methods', async (t) => {
  const any = Object.getOwnPropertyDescriptor(AbortSignal, 'any');
  const timeout = Object.getOwnPropertyDescriptor(AbortSignal, 'timeout');
  assert.ok(any && timeout);
  Object.defineProperty(AbortSignal, 'any', { ...any, value: undefined });
  Object.defineProperty(AbortSignal, 'timeout', { ...timeout, value: undefined });
  t.after(() => {
    Object.defineProperty(AbortSignal, 'any', any);
    Object.defineProperty(AbortSignal, 'timeout', timeout);
  });
  assert.equal(AbortSignal.any, undefined);
  assert.equal(AbortSignal.timeout, undefined);
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json({ success: true }));
  await sendEnquiry(endpoint, enquiry, new AbortController().signal);
  assert.equal(fetch.mock.callCount(), 1);
});

test('response deadline is one minute and completed requests release their timer', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const signals: AbortSignal[] = [];
  t.mock.method(globalThis, 'fetch', async (_url: RequestInfo | URL, options?: RequestInit) => {
    const signal = options?.signal;
    assert.ok(signal);
    signals.push(signal);
    if (signals.length === 1) return Response.json({ success: true });
    return new Promise<Response>((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    });
  });
  await sendEnquiry(endpoint, enquiry, new AbortController().signal);
  t.mock.timers.tick(60_000);
  assert.equal(signals[0].aborted, false);

  const pending = sendEnquiry(endpoint, enquiry, new AbortController().signal);
  const rejected = assert.rejects(pending, { name: 'TimeoutError' });
  t.mock.timers.tick(59_999);
  assert.equal(signals[1].aborted, false);
  t.mock.timers.tick(1);
  await rejected;
  assert.equal(signals.length, 2);
});
