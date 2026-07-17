import { NextRequest, NextResponse } from "next/server"

const BACKEND_BASE = (process.env.MDC_REST_API_BASE ?? "http://localhost:5299/api/v1").replace(/\/$/, "")

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  const targetUrl = `${BACKEND_BASE}/${path.join("/")}${request.nextUrl.search}`

  try {
    const response = await fetch(targetUrl, { cache: "no-store" })
    const body = await response.text()

    return new NextResponse(body, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") ?? "application/json",
      },
    })
  } catch {
    return NextResponse.json({ error: `Failed to reach REST API at ${targetUrl}` }, { status: 502 })
  }
}
