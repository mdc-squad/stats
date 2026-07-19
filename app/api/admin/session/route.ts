import { NextRequest, NextResponse } from "next/server"

const SESSION_COOKIE = "mdc_admin_jwt"

/** Sets the httpOnly session cookie from a token obtained via the Discord OAuth callback flight. */
export async function POST(request: NextRequest) {
  const { token } = (await request.json().catch(() => ({}))) as { token?: string }
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 4,
  })
  return response
}

export function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete(SESSION_COOKIE)
  return response
}
