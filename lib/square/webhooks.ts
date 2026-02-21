import { WebhooksHelper } from 'square'

/**
 * Verifies the x-square-hmacsha256-signature header on an incoming webhook
 * using the Square SDK's built-in WebhooksHelper.
 */
export async function verifySquareWebhookSignature({
  rawBody,
  signature,
  notificationUrl,
}: {
  rawBody: string
  signature: string
  notificationUrl: string
}): Promise<boolean> {
  const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY
  if (!key) {
    console.error('[webhooks] SQUARE_WEBHOOK_SIGNATURE_KEY is not set')
    return false
  }

  try {
    return WebhooksHelper.verifySignature({ requestBody: rawBody, signatureHeader: signature, signatureKey: key, notificationUrl })
  } catch {
    return false
  }
}
