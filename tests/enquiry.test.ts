import assert from 'node:assert/strict';
import test from 'node:test';
import { sendEnquiry, type Enquiry } from '../src/lib/enquiry.ts';

const endpoint = 'https://formsubmit.co/ajax/recipient@example.com';
const enquiry: Enquiry = {
  Jméno: 'Žofie Nováková',
  email: 'visitor@example.com',
  Zpráva: 'Skleněné dveře, prosím.',
  _honey: '',
  _subject: 'SKLOSERVIS-BROD: Nezávazná poptávka',
  _template: 'basic',
  _captcha: 'false',
};

test('relay acceptance requires explicit true and sends one JSON payload without extra recipients', async (t) => {
  for (const success of [true, 'true']) {
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
        return Response.json({ success });
      },
    );
    await sendEnquiry(endpoint, enquiry, new AbortController().signal);
    assert.equal(fetch.mock.callCount(), 1);
    fetch.mock.restore();
  }
});

test('HTTP errors, HTML, malformed JSON and ambiguous success never confirm acceptance', async (t) => {
  const responses = [
    Response.json({ success: true }, { status: 500 }),
    new Response('<h1>Thank you</h1>'),
    new Response('{"success":'),
    ...[null, [], {}, { success: false }, { success: 'false' }, { success: 1 }].map((body) =>
      Response.json(body),
    ),
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
