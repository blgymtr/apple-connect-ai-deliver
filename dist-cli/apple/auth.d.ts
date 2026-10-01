/**
 * Normalizes private key string to valid PEM format.
 * Supports raw PEM, base64-encoded PEM, or PEM with literal \n escapes.
 */
export declare function normalizePrivateKey(keyInput: string): string;
/**
 * Generates an ES256 JSON Web Token (JWT) for the Apple App Store Connect API.
 * Uses Node.js native crypto with ieee-p1363 encoding.
 */
export declare function generateAppStoreConnectToken(keyId: string, issuerId: string, privateKeyPem: string): string;
