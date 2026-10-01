import * as crypto from 'crypto';

function base64UrlEncode(input: string | Buffer): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf-8');
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Normalizes private key string to valid PEM format.
 * Supports raw PEM, base64-encoded PEM, or PEM with literal \n escapes.
 */
export function normalizePrivateKey(keyInput: string): string {
  let key = keyInput.trim();

  // If provided as a base64 encoded string of the PEM file
  if (!key.includes('BEGIN PRIVATE KEY') && !key.includes('BEGIN EC PRIVATE KEY')) {
    try {
      const decoded = Buffer.from(key, 'base64').toString('utf-8');
      if (decoded.includes('BEGIN PRIVATE KEY') || decoded.includes('BEGIN EC PRIVATE KEY')) {
        key = decoded;
      }
    } catch {
      // not base64, continue
    }
  }

  // Replace literal '\n' characters if passed as an inline env variable
  key = key.replace(/\\n/g, '\n');

  return key;
}

/**
 * Generates an ES256 JSON Web Token (JWT) for the Apple App Store Connect API.
 * Uses Node.js native crypto with ieee-p1363 encoding.
 */
export function generateAppStoreConnectToken(
  keyId: string,
  issuerId: string,
  privateKeyPem: string
): string {
  const normalizedKey = normalizePrivateKey(privateKeyPem);

  const header = {
    alg: 'ES256',
    kid: keyId,
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: issuerId,
    exp: now + 1200, // 20 minutes (maximum permitted by Apple)
    aud: 'appstoreconnect-v1'
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const signer = crypto.createSign('SHA256');
  signer.update(unsignedToken);

  // IEEE-P1363 gives the exact 64-byte raw R||S signature required by ES256 JWT
  const signature = signer.sign({
    key: normalizedKey,
    dsaEncoding: 'ieee-p1363'
  });

  const encodedSignature = base64UrlEncode(signature);
  return `${unsignedToken}.${encodedSignature}`;
}
