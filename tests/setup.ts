import '@testing-library/jest-dom'
import { vi, afterEach } from 'vitest'

// Env stubs — must exist before any module reads them
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = 'test-sig-key'
process.env.SQUARE_WEBHOOK_URL = 'https://test.example.com/api/webhooks/square'
process.env.SQUARE_APP_ID = 'test-square-app-id'
process.env.SQUARE_APP_SECRET = 'test-square-app-secret'
process.env.SQUARE_REDIRECT_URI = 'https://test.example.com/api/square/callback'
process.env.SQUARE_ENVIRONMENT = 'sandbox'
process.env.POINTS_TOKEN_ENCRYPTION_KEY = 'a'.repeat(64) // 64-char hex for AES-256-GCM
process.env.NEXT_PUBLIC_APP_URL = 'https://test.example.com'

global.fetch = vi.fn()

// Radix UI components (Checkbox, Select, etc.) use ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

afterEach(() => {
  // Only clear call history — do NOT call restoreAllMocks() because that
  // resets vi.fn() implementations from vi.mock() factories, breaking tests
  // that run after the first one in each file.
  vi.clearAllMocks()
})
