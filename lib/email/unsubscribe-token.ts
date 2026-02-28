import crypto from 'crypto'

const SECRET = process.env.UNSUBSCRIBE_SECRET ?? 'taplo-unsubscribe-secret'

/**
 * Generates a signed unsubscribe token for an email address.
 * Token is <email>.<hmac> where hmac is HMAC-SHA256 of the email.
 */
export function generateUnsubscribeToken(email: string): string {
  const hmac = crypto.createHmac('sha256', SECRET).update(email).digest('hex')
  return Buffer.from(`${email}.${hmac}`).toString('base64url')
}

/**
 * Verifies an unsubscribe token and returns the email if valid, null otherwise.
 */
export function verifyUnsubscribeToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8')
    const lastDot = decoded.lastIndexOf('.')
    if (lastDot === -1) return null
    const email = decoded.slice(0, lastDot)
    const expected = crypto.createHmac('sha256', SECRET).update(email).digest('hex')
    const actual = decoded.slice(lastDot + 1)
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual))) return null
    return email
  } catch {
    return null
  }
}
