import { randomBytes } from 'crypto'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no O, 0, I, 1 (ambiguous chars)
const CODE_LENGTH = 8

export function generateReferralCode(): string {
  const bytes = randomBytes(CODE_LENGTH)
  return Array.from(bytes)
    .map((b) => ALPHABET[b % ALPHABET.length])
    .join('')
}
