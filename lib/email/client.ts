import { Resend } from 'resend'

// Lazy singleton — avoids throwing at import time in test environments without RESEND_API_KEY
let _resend: Resend | null = null
export function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY)
  }
  return _resend
}

// Also export a named instance for callers that need direct SDK access (invite.ts)
export const resend = {
  emails: {
    send: (args: Parameters<Resend['emails']['send']>[0]) => getResend().emails.send(args),
  },
}

const FROM = process.env.RESEND_FROM_EMAIL ?? 'loyalty@taplo.app'

interface TransactionalEmailOptions {
  to: string
  subject: string
  html: string
  unsubscribeUrl?: string
}

/**
 * Sends a transactional email. Skips send if the customer has opted out.
 * Use resend.emails.send directly for invited (non-account) recipients.
 */
export async function sendTransactionalEmail(
  options: TransactionalEmailOptions,
): Promise<void> {
  const { to, subject, html } = options
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject,
      html,
    })
  } catch (err) {
    console.error('[email] Failed to send transactional email to', to, err)
  }
}
