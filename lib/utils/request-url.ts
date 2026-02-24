import { headers } from 'next/headers'

/**
 * Derives the app's base URL from the incoming request headers.
 * Falls back to http://localhost:3000 in environments where headers are unavailable.
 * Guards against host-header spoofing when NEXT_PUBLIC_APP_URL is configured.
 */
export async function getAppUrl(): Promise<string> {
  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const proto = (headersList.get('x-forwarded-proto') ?? '').split(',')[0].trim()
    || (host.startsWith('localhost') ? 'http' : 'https')

  let configuredHost: string | null = null
  try {
    configuredHost = process.env.NEXT_PUBLIC_APP_URL
      ? new URL(process.env.NEXT_PUBLIC_APP_URL).host
      : null
  } catch {
    // Malformed NEXT_PUBLIC_APP_URL — skip host guard
  }

  if (configuredHost && host !== configuredHost && !host.startsWith('localhost')) {
    throw new Error(`Unexpected host header: ${host}`)
  }

  return `${proto}://${host}`
}
