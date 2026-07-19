import { NextResponse } from "next/server"

const BACKEND_BASE = (process.env.MDC_REST_API_BASE ?? "http://localhost:5299/api/v1").replace(/\/$/, "")

/**
 * The Discord OAuth dance is a chain of full-page redirects (frontend -> backend -> Discord ->
 * backend -> frontend), so the browser must be sent straight to the backend's authorize redirect.
 * This route exists only so the browser never needs to know the backend's URL directly.
 */
export function GET() {
  return NextResponse.redirect(`${BACKEND_BASE}/auth/discord/login`)
}
