export interface ReferralInviteProps {
  merchantName: string
  merchantLogoUrl: string | null
  programName: string | null
  programDescription: string | null
  joinUrl: string
  programPageUrl: string
}

export function renderReferralInvite(props: ReferralInviteProps): string {
  const { merchantName, merchantLogoUrl, programName, programDescription, joinUrl, programPageUrl } =
    props

  const title = programName ?? `${merchantName} Referral Program`

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>You're invited to ${merchantName}</title>
</head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;border:1px solid #E5E7EB;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:#111827;padding:24px;text-align:center;">
              ${
                merchantLogoUrl
                  ? `<img src="${merchantLogoUrl}" alt="${merchantName}" height="48" style="max-height:48px;object-fit:contain;" />`
                  : `<p style="color:#FFFFFF;font-size:20px;font-weight:700;margin:0;">${merchantName}</p>`
              }
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 24px;">
              <h1 style="font-size:22px;font-weight:700;color:#111827;margin:0 0 8px 0;">
                You're invited to join ${title}
              </h1>
              ${
                programDescription
                  ? `<p style="font-size:15px;color:#374151;margin:0 0 20px 0;">${programDescription}</p>`
                  : `<p style="font-size:15px;color:#374151;margin:0 0 20px 0;">${merchantName} is inviting you to their loyalty rewards program. Sign up to start earning rewards on every visit.</p>`
              }
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;">
                <tr>
                  <td align="center">
                    <a href="${joinUrl}"
                       style="display:inline-block;background:#111827;color:#FFFFFF;font-size:15px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;">
                      Sign Up &amp; Join
                    </a>
                  </td>
                </tr>
              </table>
              <p style="font-size:13px;color:#6B7280;margin:0;text-align:center;">
                <a href="${programPageUrl}" style="color:#6B7280;text-decoration:underline;">
                  Learn more about the ${title}
                </a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:16px 32px;text-align:center;">
              <p style="font-size:12px;color:#9CA3AF;margin:0;">
                Powered by Taplo &middot; You received this because ${merchantName} invited you.
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
