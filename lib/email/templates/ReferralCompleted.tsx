export type RewardDisplay =
  | { type: 'points'; merchantPoints: number; taploPoints: number; merchantName: string }
  | { type: 'item'; title: string }
  | { type: 'discount_percent'; value: number; label?: string }
  | { type: 'discount_flat'; value: number; label?: string }

export interface ReferralCompletedProps {
  recipientName: string
  merchantName: string
  merchantLogoUrl: string | null
  role: 'referrer' | 'referee'
  reward: RewardDisplay
  walletUrl: string
  unsubscribeUrl: string
}

function renderReward(reward: RewardDisplay): string {
  switch (reward.type) {
    case 'points':
      return `
        <p style="font-size:16px;color:#374151;margin:0 0 8px 0;">
          You earned <strong>${reward.merchantPoints} ${reward.merchantName} points</strong>
          ${reward.taploPoints > 0 ? `+ <strong>${reward.taploPoints} Taplo points</strong>` : ''}
        </p>`

    case 'item':
      return `
        <p style="font-size:16px;color:#374151;margin:0 0 8px 0;">
          You earned: <strong>${reward.title}</strong>
        </p>
        <p style="font-size:14px;color:#6B7280;margin:0;">
          Show your wallet to the merchant to redeem this reward.
        </p>`

    case 'discount_percent':
      return `
        <p style="font-size:16px;color:#374151;margin:0 0 8px 0;">
          You earned: <strong>${reward.value}% discount</strong>
          ${reward.label ? ` — ${reward.label}` : ''}
        </p>
        <p style="font-size:14px;color:#6B7280;margin:0;">
          Show your wallet to the merchant to redeem this reward.
        </p>`

    case 'discount_flat':
      return `
        <p style="font-size:16px;color:#374151;margin:0 0 8px 0;">
          You earned: <strong>$${reward.value.toFixed(2)} off</strong>
          ${reward.label ? ` — ${reward.label}` : ''}
        </p>
        <p style="font-size:14px;color:#6B7280;margin:0;">
          Show your wallet to the merchant to redeem this reward.
        </p>`
  }
}

export function renderReferralCompleted(props: ReferralCompletedProps): string {
  const {
    recipientName,
    merchantName,
    merchantLogoUrl,
    role,
    reward,
    walletUrl,
    unsubscribeUrl,
  } = props

  const roleLabel = role === 'referrer' ? 'referral was successful' : 'referral reward is ready'

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Your ${merchantName} referral bonus</title>
</head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;border:1px solid #E5E7EB;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:#111827;padding:24px;text-align:center;">
              ${merchantLogoUrl
                ? `<img src="${merchantLogoUrl}" alt="${merchantName}" height="48" style="max-height:48px;object-fit:contain;" />`
                : `<p style="color:#FFFFFF;font-size:20px;font-weight:700;margin:0;">${merchantName}</p>`
              }
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 24px;">
              <p style="font-size:14px;color:#6B7280;margin:0 0 8px 0;">Hi ${recipientName},</p>
              <h1 style="font-size:22px;font-weight:700;color:#111827;margin:0 0 16px 0;">
                Your ${roleLabel}!
              </h1>
              <div style="background:#F3F4F6;border-radius:8px;padding:16px;margin:0 0 24px 0;">
                ${renderReward(reward)}
              </div>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${walletUrl}"
                       style="display:inline-block;background:#111827;color:#FFFFFF;font-size:15px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;">
                      View My Wallet
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:16px 32px;text-align:center;">
              <p style="font-size:12px;color:#9CA3AF;margin:0;">
                Powered by Taplo &middot;
                <a href="${unsubscribeUrl}" style="color:#6B7280;text-decoration:underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
