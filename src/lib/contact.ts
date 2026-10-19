export type ContactKind = 'phone' | 'email';

/** Obfuscation for basic HTML scrapers, not encryption or access control. */
export function encodeContact(value: string): string {
  return btoa(value);
}

export function decodeContact(encoded: string, kind: ContactKind): string {
  const value = atob(encoded);
  const valid =
    kind === 'phone' ? /^\+420\d{9}$/.test(value) : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  if (!valid) throw new TypeError('Invalid contact value');
  return value;
}

export function contactUri(value: string, kind: ContactKind): string {
  return kind === 'phone'
    ? `tel:${value}`
    : `mailto:${encodeURIComponent(value).replace('%40', '@')}`;
}
