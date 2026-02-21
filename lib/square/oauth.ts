import { randomBytes } from 'crypto'

const SQUARE_SCOPES = [
  'MERCHANT_PROFILE_READ',
  'PAYMENTS_READ',
].join('+')

/**
 * Builds the Square OAuth authorization URL and returns both the URL
 * and the state token (must be stored in a cookie for CSRF verification).
 */
export function buildOAuthUrl(): { url: string; state: string } {
  const state = randomBytes(24).toString('hex')
  const baseUrl =
    process.env.SQUARE_ENVIRONMENT === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com'

  const params = new URLSearchParams({
    client_id: process.env.SQUARE_APP_ID!,
    scope: SQUARE_SCOPES,
    state,
    redirect_uri: process.env.SQUARE_REDIRECT_URI!,
    session: 'false',
  })

  const url = `${baseUrl}/oauth2/authorize?${params.toString()}`
  return { url, state }
}

export interface SquareTokenResponse {
  access_token: string
  refresh_token: string
  expires_at: string      // ISO 8601
  merchant_id: string
  token_type: string
}

/**
 * Exchanges an OAuth authorization code for tokens.
 */
export async function exchangeCodeForTokens(code: string): Promise<SquareTokenResponse> {
  const baseUrl =
    process.env.SQUARE_ENVIRONMENT === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com'

  const response = await fetch(`${baseUrl}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Square-Version': '2024-01-18' },
    body: JSON.stringify({
      client_id: process.env.SQUARE_APP_ID,
      client_secret: process.env.SQUARE_APP_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.SQUARE_REDIRECT_URI,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Square token exchange failed: ${response.status} ${body}`)
  }

  return response.json() as Promise<SquareTokenResponse>
}

/**
 * Refreshes an access token using the stored refresh token.
 */
export async function refreshAccessToken(refreshToken: string): Promise<SquareTokenResponse> {
  const baseUrl =
    process.env.SQUARE_ENVIRONMENT === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com'

  const response = await fetch(`${baseUrl}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Square-Version': '2024-01-18' },
    body: JSON.stringify({
      client_id: process.env.SQUARE_APP_ID,
      client_secret: process.env.SQUARE_APP_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Square token refresh failed: ${response.status} ${body}`)
  }

  return response.json() as Promise<SquareTokenResponse>
}
