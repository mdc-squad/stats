import { NextRequest, NextResponse } from "next/server"

const BACKEND_BASE = (process.env.MDC_REST_API_BASE ?? "http://localhost:5299/api/v1").replace(/\/$/, "")
const SESSION_COOKIE = "mdc_admin_jwt"

async function proxy(request: NextRequest, path: string[]) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const targetUrl = `${BACKEND_BASE}/${path.join("/")}${request.nextUrl.search}`
  const hasBody = request.method !== "GET" && request.method !== "DELETE"

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(hasBody ? { "content-type": "application/json" } : {}),
      },
      body: hasBody ? await request.text() : undefined,
      cache: "no-store",
    })

    const body = await response.text()
    const result = new NextResponse(body || null, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
    })

    if (response.status === 401) {
      result.cookies.delete(SESSION_COOKIE)
    }

    return result
  } catch {
    return NextResponse.json({ error: `Failed to reach admin API at ${targetUrl}` }, { status: 502 })
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await context.params).path)
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await context.params).path)
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await context.params).path)
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await context.params).path)
}
