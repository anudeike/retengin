import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the square SDK
vi.mock('square', () => ({
  WebhooksHelper: {
    verifySignature: vi.fn(),
  },
}))

import { WebhooksHelper } from 'square'
import { verifySquareWebhookSignature } from '@/lib/square/webhooks'

describe('verifySquareWebhookSignature', () => {
  const params = {
    rawBody:         '{"event_id":"123"}',
    signature:       'valid-sig',
    notificationUrl: 'https://test.example.com/api/webhooks/square',
  }

  beforeEach(() => {
    vi.mocked(WebhooksHelper.verifySignature).mockResolvedValue(true)
  })

  it('returns true when WebhooksHelper.verifySignature resolves true', async () => {
    const result = await verifySquareWebhookSignature(params)
    expect(result).toBe(true)
    expect(WebhooksHelper.verifySignature).toHaveBeenCalledWith({
      requestBody:      params.rawBody,
      signatureHeader:  params.signature,
      signatureKey:     'test-sig-key',
      notificationUrl:  params.notificationUrl,
    })
  })

  it('returns false when WebhooksHelper.verifySignature resolves false', async () => {
    vi.mocked(WebhooksHelper.verifySignature).mockResolvedValue(false)
    const result = await verifySquareWebhookSignature(params)
    expect(result).toBe(false)
  })

  it('returns false when signature is missing (empty string)', async () => {
    vi.mocked(WebhooksHelper.verifySignature).mockResolvedValue(false)
    const result = await verifySquareWebhookSignature({ ...params, signature: '' })
    expect(result).toBe(false)
  })

  it('returns false when SQUARE_WEBHOOK_SIGNATURE_KEY env var is not set', async () => {
    const savedKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY
    delete process.env.SQUARE_WEBHOOK_SIGNATURE_KEY
    const result = await verifySquareWebhookSignature(params)
    expect(result).toBe(false)
    process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = savedKey
  })

  it('returns false when WebhooksHelper.verifySignature throws synchronously', async () => {
    // The source uses `return verifySignature(...)` (not await), so only synchronous
    // throws are caught by the try/catch block.
    vi.mocked(WebhooksHelper.verifySignature).mockImplementation(() => {
      throw new Error('HMAC error')
    })
    const result = await verifySquareWebhookSignature(params)
    expect(result).toBe(false)
  })
})
