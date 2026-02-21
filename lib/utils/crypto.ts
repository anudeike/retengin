import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12   // 96-bit IV recommended for GCM
const TAG_LENGTH = 16  // 128-bit auth tag

function getKey(): Buffer {
  const hex = process.env.POINTS_TOKEN_ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error('POINTS_TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)')
  }
  return Buffer.from(hex, 'hex')
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * Returns a base64 string: IV (12 bytes) + tag (16 bytes) + ciphertext.
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  // Pack: iv | tag | ciphertext
  const packed = Buffer.concat([iv, tag, encrypted])
  return packed.toString('base64')
}

/**
 * Decrypts a base64 string produced by `encrypt`.
 */
export function decrypt(ciphertext: string): string {
  const key = getKey()
  const packed = Buffer.from(ciphertext, 'base64')

  const iv = packed.subarray(0, IV_LENGTH)
  const tag = packed.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const encrypted = packed.subarray(IV_LENGTH + TAG_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString('utf8')
}
