import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseMock } from '@/tests/mocks/supabase'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { verifySquareWebhookSignature } from '@/lib/square/webhooks'
import { handlePaymentCompleted, handleRefundCreated, handleInvoicePaymentMade } from '@/lib/points/engine'

vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: vi.fn(),
  createServerClient: vi.fn(),
}))

vi.mock('@/lib/square/webhooks', () => ({
  verifySquareWebhookSignature: vi.fn(),
}))

vi.mock('@/lib/points/engine', () => ({
  handlePaymentCompleted:     vi.fn().mockResolvedValue(undefined),
  handleRefundCreated:        vi.fn().mockResolvedValue(undefined),
  handleInvoicePaymentMade:   vi.fn().mockResolvedValue(undefined),
}))

// Import the route AFTER mocks are declared
import { POST } from '@/app/api/webhooks/square/route'

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/webhooks/square', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('POST /api/webhooks/square', () => {
  let mockClient: ReturnType<typeof createSupabaseMock>

  beforeEach(() => {
    mockClient = createSupabaseMock()
    vi.mocked(createServiceRoleClient).mockReturnValue(mockClient as never)
    vi.mocked(verifySquareWebhookSignature).mockResolvedValue(true)
    // Idempotency insert succeeds by default
    mockClient._setResponse('processed_webhook_events', { data: null, error: null })
  })

  it('returns 401 when signature verification fails', async () => {
    vi.mocked(verifySquareWebhookSignature).mockResolvedValue(false)
    const res = await POST(makeRequest({ event_id: 'evt-1', type: 'payment.updated' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when body is not valid JSON', async () => {
    const req = new Request('http://localhost/api/webhooks/square', {
      method: 'POST',
      body: 'not-valid-json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when event_id is missing from body', async () => {
    const res = await POST(makeRequest({ type: 'payment.updated' })) // no event_id
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/event_id/i)
  })

  it('returns 200 immediately for duplicate event_id (23505 on processed_webhook_events)', async () => {
    mockClient._setResponse('processed_webhook_events', {
      data: null,
      error: { code: '23505', message: 'duplicate key' },
    })
    const res = await POST(makeRequest({ event_id: 'evt-dup', type: 'payment.updated' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.received).toBe(true)
  })

  it('returns 200 and calls handlePaymentCompleted for payment.updated with status COMPLETED', async () => {
    const payment = { id: 'pay-1', status: 'COMPLETED', buyer_email_address: 'user@example.com', amount_money: { amount: 1000 } }
    const res = await POST(makeRequest({
      event_id: 'evt-pay',
      type: 'payment.updated',
      merchant_id: 'sq-merchant-1',
      data: { object: { payment } },
    }))
    expect(res.status).toBe(200)
    // Flush microtasks so fire-and-forget handler is called
    await new Promise((r) => setTimeout(r, 0))
    expect(handlePaymentCompleted).toHaveBeenCalledWith('sq-merchant-1', payment)
  })

  it('does NOT call handlePaymentCompleted for payment.updated with non-COMPLETED status', async () => {
    const payment = { id: 'pay-2', status: 'APPROVED', buyer_email_address: 'user@example.com', amount_money: { amount: 1000 } }
    const res = await POST(makeRequest({
      event_id: 'evt-pay-approved',
      type: 'payment.updated',
      merchant_id: 'sq-merchant-1',
      data: { object: { payment } },
    }))
    expect(res.status).toBe(200)
    await new Promise((r) => setTimeout(r, 0))
    expect(handlePaymentCompleted).not.toHaveBeenCalled()
  })

  it('returns 200 and calls handleRefundCreated for refund.created', async () => {
    const refund = { id: 'ref-1', payment_id: 'pay-1' }
    const res = await POST(makeRequest({
      event_id: 'evt-refund',
      type: 'refund.created',
      merchant_id: 'sq-merchant-1',
      data: { object: { refund } },
    }))
    expect(res.status).toBe(200)
    await new Promise((r) => setTimeout(r, 0))
    expect(handleRefundCreated).toHaveBeenCalledWith('sq-merchant-1', refund)
  })

  it('returns 200 and calls handleInvoicePaymentMade for invoice.payment_made', async () => {
    const invoice = {
      id: 'inv:abc123',
      order_id: 'order-1',
      primary_recipient: { email_address: 'user@example.com' },
      payment_requests: [{ total_completed_amount_money: { amount: 10000 } }],
    }
    const res = await POST(makeRequest({
      event_id: 'evt-invoice',
      type: 'invoice.payment_made',
      merchant_id: 'sq-merchant-1',
      data: { object: { invoice } },
    }))
    expect(res.status).toBe(200)
    await new Promise((r) => setTimeout(r, 0))
    expect(handleInvoicePaymentMade).toHaveBeenCalledWith('sq-merchant-1', invoice)
  })

  it('returns 200 without calling any handler for unknown event type', async () => {
    const res = await POST(makeRequest({
      event_id: 'evt-unknown',
      type: 'invoice.published',
      merchant_id: 'sq-merchant-1',
      data: { object: {} },
    }))
    expect(res.status).toBe(200)
    await new Promise((r) => setTimeout(r, 0))
    expect(handlePaymentCompleted).not.toHaveBeenCalled()
    expect(handleRefundCreated).not.toHaveBeenCalled()
  })

  it('fire-and-forget: returns 200 before async handler completes', async () => {
    let handlerResolved = false
    vi.mocked(handlePaymentCompleted).mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 50))
      handlerResolved = true
    })

    const res = await POST(makeRequest({
      event_id: 'evt-slow',
      type: 'payment.updated',
      merchant_id: 'sq-merchant-1',
      data: { object: { payment: { status: 'COMPLETED' } } },
    }))

    // Response is immediate
    expect(res.status).toBe(200)
    expect(handlerResolved).toBe(false) // handler not yet done
  })
})
