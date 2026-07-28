import type { NextRequest } from "next/server"
import { createLineupPngErrorResponse, createLineupPngResponse, resolveLineupImageFormat, resolveLineupPngSide } from "@/lib/lineup-png-response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ file?: string }> },
) {
  const { file } = await params
  const side = resolveLineupPngSide(file)
  const force = request.nextUrl.searchParams.get("refresh") === "true"
  const fileFormat = String(file ?? "").trim().toLowerCase().endsWith(".png") ? "png" : null
  const format = resolveLineupImageFormat(request.nextUrl.searchParams.get("format") ?? fileFormat)

  try {
    return await createLineupPngResponse(side, force, format)
  } catch (error) {
    return createLineupPngErrorResponse(error)
  }
}

export const HEAD = GET
