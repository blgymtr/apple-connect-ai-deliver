import test from 'node:test';
import assert from 'node:assert';
import * as crypto from 'crypto';
import { generateAppStoreConnectToken, normalizePrivateKey } from '../src/apple/auth';

test('normalizePrivateKey formats raw and escaped keys correctly', () => {
  const inlineKey = '-----BEGIN PRIVATE KEY-----\\nABCDEF\\n-----END PRIVATE KEY-----';
  const normalized = normalizePrivateKey(inlineKey);
  assert.strictEqual(normalized, '-----BEGIN PRIVATE KEY-----\nABCDEF\n-----END PRIVATE KEY-----');
});

test('generateAppStoreConnectToken generates a valid verifiable ES256 JWT', () => {
  // Generate a valid ECDSA P-256 keypair for testing
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });

  const keyId = 'TESTKEY123';
  const issuerId = '550e8400-e29b-41d4-a716-446655440000';

  const token = generateAppStoreConnectToken(keyId, issuerId, privateKey);
  assert.ok(token);

  const parts = token.split('.');
  assert.strictEqual(parts.length, 3);

  // Verify Header
  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf-8'));
  assert.strictEqual(header.alg, 'ES256');
  assert.strictEqual(header.kid, keyId);
  assert.strictEqual(header.typ, 'JWT');

  // Verify Payload
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
  assert.strictEqual(payload.iss, issuerId);
  assert.strictEqual(payload.aud, 'appstoreconnect-v1');
  assert.ok(payload.exp > Math.floor(Date.now() / 1000));

  // Verify Cryptographic Signature
  const verifier = crypto.createVerify('SHA256');
  verifier.update(`${parts[0]}.${parts[1]}`);
  const signatureBuffer = Buffer.from(parts[2], 'base64url');

  const isValid = verifier.verify(
    {
      key: publicKey,
      dsaEncoding: 'ieee-p1363'
    },
    signatureBuffer
  );

  assert.strictEqual(isValid, true, 'Token signature should verify successfully with ES256 P-256 public key');
});
