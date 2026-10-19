export interface Enquiry {
  Jméno: string;
  email: string;
  Zpráva: string;
  _honey: string;
  _subject: string;
  _template: 'basic';
  _captcha: 'false';
}

/** Resolves only when the relay explicitly accepts the request, not on inbox delivery. */
export async function sendEnquiry(
  endpoint: string,
  enquiry: Enquiry,
  signal: AbortSignal,
): Promise<void> {
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  if (signal.aborted) abort();
  else signal.addEventListener('abort', abort, { once: true });
  // Keep the deadline cancellable and support browsers without AbortSignal.any/timeout.
  const timer = setTimeout(
    () => controller.abort(new DOMException('FormSubmit response timed out', 'TimeoutError')),
    60_000,
  );
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(enquiry),
      redirect: 'error',
      credentials: 'omit',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`FormSubmit HTTP ${response.status}`);
    const result: unknown = await response.json();
    if (
      typeof result !== 'object' ||
      result === null ||
      !('success' in result) ||
      (result.success !== true && result.success !== 'true')
    ) {
      throw new Error('FormSubmit did not confirm acceptance');
    }
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}
