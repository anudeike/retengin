import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const PROTECTED_ROUTES: Record<string, string> = {
  '/wallet': '/wallet',
  '/dashboard': '/dashboard',
  '/admin': '/admin',
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Let the session refresher run on all routes
  const { supabaseResponse, user } = await updateSession(request)

  // Redirect unauthenticated users away from protected routes
  if (!user) {
    for (const prefix of Object.keys(PROTECTED_ROUTES)) {
      if (pathname.startsWith(prefix)) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/'
        redirectUrl.searchParams.set('redirectedFrom', pathname)
        return NextResponse.redirect(redirectUrl)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
