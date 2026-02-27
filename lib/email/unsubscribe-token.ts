import { createHmac } from 'crypto'

function getSecret(): string {
  const secret = process.env.EMAIL_UNSUBSCRIBE_SECRET
  if (!secret) {
    console.warn('[email] EMAIL_UNSUBSCRIBE_SECRET is not set')
    return 'dev-fallback-secret'
  }
  return secret
}

function b64url(str: string): string {
  return Buffer.from(str).toString('base64url')
}

/** Create a signed unsubscribe token for a customer (optionally scoped to a merchant). */
export function signUnsubscribeToken(customerId: string, merchantId?: string): string {
  const payload = JSON.stringify({ customerId, merchantId: merchantId ?? null })
  const sig = createHmac('sha256', getSecret()).update(payload).digest('base64url')
  return `${b64url(payload)}.${sig}`
}

/** Verify and decode an unsubscribe token. Returns null if invalid. */
export function verifyUnsubscribeToken(
  token: string,
): { customerId: string; merchantId: string | null } | null {
  const dot = token.lastIndexOf('.')
  if (dot === -1) return null
  const payloadB64 = token.slice(0, dot)
  const sig = token.slice(dot + 1)

  const payload = Buffer.from(payloadB64, 'base64url').toString('utf8')
  const expectedSig = createHmac('sha256', getSecret()).update(payload).digest('base64url')
  if (sig !== expectedSig) return null

  try {
    return JSON.parse(payload) as { customerId: string; merchantId: string | null }
  } catch {
    return null
  }
}

/** Build a full unsubscribe URL for inclusion in email footers. */
export function unsubscribeUrl(customerId: string, merchantId: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const token = signUnsubscribeToken(customerId, merchantId)
  return `${appUrl}/api/email/unsubscribe?token=${token}`
}
