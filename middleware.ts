import { NextRequest, NextResponse } from "next/server"

const SESSION_COOKIE = "mdc_admin_jwt"
const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/discord-callback"]

/**
 * UX-only guard: redirects unauthenticated visitors away from /admin/* before the page even
 * renders. Not a security boundary — every admin API call is re-checked by the backend's
 * [Authorize] regardless of whether this middleware ran.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (PUBLIC_ADMIN_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value)
  if (!hasSession) {
    const loginUrl = new URL("/admin/login", request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"],
}
