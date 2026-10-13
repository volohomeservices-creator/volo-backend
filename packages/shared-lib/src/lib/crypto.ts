import 'server-only';
import crypto from 'crypto';

let encryptionKeyBuffer: Buffer | null = null;

/**
 * Validates and retrieves the encryption key required for symmetric bank account encryption.
 * Designed to cleanly separate KMS config from business logic for future cloud KMS migrations.
 */
function getEncryptionKey(): Buffer {
  if (encryptionKeyBuffer) return encryptionKeyBuffer;

  const key = process.env.BANK_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'volo-secure-banking-aes256-encryption-key-32b';

  // Ensure the key is exactly 32 bytes for aes-256-cbc
  encryptionKeyBuffer = Buffer.from(key.padEnd(32, '0').slice(0, 32));
  return encryptionKeyBuffer;
}

export function encryptData(text: string): string {
  const iv = crypto.randomBytes(16);
  const keyBuffer = getEncryptionKey();
  const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decryptData(text: string): string {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift() as string, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const keyBuffer = getEncryptionKey();
  const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
