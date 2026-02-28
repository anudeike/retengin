import { Resend } from 'resend'

// Lazy singleton — avoids throwing at import time in test environments without RESEND_API_KEY
let _resend: Resend | null = null
export function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY)
  }
  return _resend
}

// Named proxy for callers that need direct SDK access (send.ts, invite.ts)
export const resend = {
  emails: {
    send: (args: Parameters<Resend['emails']['send']>[0]) => getResend().emails.send(args),
  },
}
