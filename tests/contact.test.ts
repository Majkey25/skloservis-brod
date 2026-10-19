import assert from 'node:assert/strict';
import test from 'node:test';
import { contactUri, decodeContact, encodeContact } from '../src/lib/contact.ts';

test('contact actions preserve the exact number and email including mail URI delimiters', () => {
  const phone = '+420123456789';
  const email = 'enquiries+glass@example.com';
  assert.equal(decodeContact(encodeContact(phone), 'phone'), phone);
  assert.equal(decodeContact(encodeContact(email), 'email'), email);
  assert.equal(contactUri(phone, 'phone'), `tel:${phone}`);
  assert.equal(contactUri(email, 'email'), 'mailto:enquiries%2Bglass@example.com');
});

test('contact decoding rejects malformed payloads and non-contact values', () => {
  assert.throws(() => decodeContact('%%%', 'email'));
  for (const value of [
    'javascript:alert(1)',
    'name@example.com\r\nBcc:other@example.com',
    'not-an-email',
  ])
    assert.throws(() => decodeContact(encodeContact(value), 'email'));
  for (const value of ['+42012345', '123456789', '+420123456789?body=test'])
    assert.throws(() => decodeContact(encodeContact(value), 'phone'));
});
