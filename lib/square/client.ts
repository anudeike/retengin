import { SquareClient, SquareEnvironment } from 'square'
import { decrypt, encrypt } from '@/lib/utils/crypto'
import { refreshAccessToken } from '@/lib/square/oauth'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Creates a Square SDK client for a given merchant, auto-refreshing
 * the access token if it has expired.
 */
export async function getSquareClientForMerchant(merchantId: string): Promise<SquareClient> {
  const supabase = createServiceRoleClient()

  const { data: merchant, error } = await supabase
    .from('merchants')
    .select('square_access_token, square_refresh_token, square_token_expires_at')
    .eq('id', merchantId)
    .single()

  if (error || !merchant?.square_access_token) {
    throw new Error(`No Square credentials found for merchant ${merchantId}`)
  }

  let accessToken = decrypt(merchant.square_access_token)

  // Refresh if token expires within 5 minutes
  if (merchant.square_token_expires_at) {
    const expiresAt = new Date(merchant.square_token_expires_at)
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000)

    if (expiresAt <= fiveMinutesFromNow && merchant.square_refresh_token) {
      const refreshToken = decrypt(merchant.square_refresh_token)
      const refreshed = await refreshAccessToken(refreshToken)

      accessToken = refreshed.access_token

      // Persist updated tokens
      await supabase
        .from('merchants')
        .update({
          square_access_token: encrypt(refreshed.access_token),
          square_refresh_token: encrypt(refreshed.refresh_token),
          square_token_expires_at: refreshed.expires_at,
          updated_at: new Date().toISOString(),
        })
        .eq('id', merchantId)
    }
  }

  return new SquareClient({
    token: accessToken,
    environment:
      process.env.SQUARE_ENVIRONMENT === 'production'
        ? SquareEnvironment.Production
        : SquareEnvironment.Sandbox,
  })
}
