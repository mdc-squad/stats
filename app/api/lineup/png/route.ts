import type { NextRequest } from "next/server"
import { createLineupPngErrorResponse, createLineupPngResponse, resolveLineupImageFormat, resolveLineupPngSide } from "@/lib/lineup-png-response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const side = resolveLineupPngSide(request.nextUrl.searchParams.get("side"))
  const force = request.nextUrl.searchParams.get("refresh") === "true"
  const format = resolveLineupImageFormat(request.nextUrl.searchParams.get("format"))

  try {
    return await createLineupPngResponse(side, force, format)
  } catch (error) {
    return createLineupPngErrorResponse(error)
  }
}

export const HEAD = GET
