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
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(enquiry),
    redirect: 'error',
    credentials: 'omit',
    signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
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
}
