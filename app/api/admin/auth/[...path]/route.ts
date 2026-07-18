import { NextRequest, NextResponse } from "next/server"

const BACKEND_BASE = (process.env.MDC_REST_API_BASE ?? "http://localhost:5299/api/v1").replace(/\/$/, "")
const SESSION_COOKIE = "mdc_admin_jwt"

/**
 * Proxies unauthenticated auth actions (login, bootstrap) to the backend. On success, the JWT is
 * moved into an httpOnly cookie here and stripped from the JSON body — the raw token never reaches
 * client JS for password login, matching the Discord OAuth flow's handling in /admin/discord-callback.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  const targetUrl = `${BACKEND_BASE}/auth/${path.join("/")}`

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: await request.text(),
      cache: "no-store",
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok || !payload) {
      return NextResponse.json(payload ?? { error: "Request failed" }, { status: response.status })
    }

    const { token, ...rest } = payload as { token?: string; [key: string]: unknown }
    const result = NextResponse.json(rest)
    if (token) {
      result.cookies.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 4,
      })
    }

    return result
  } catch {
    return NextResponse.json({ error: `Failed to reach admin API at ${targetUrl}` }, { status: 502 })
  }
}
