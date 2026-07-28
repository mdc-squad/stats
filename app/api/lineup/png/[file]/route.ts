import type { NextRequest } from "next/server"
import { createLineupPngErrorResponse, createLineupPngResponse, resolveLineupPngSide } from "@/lib/lineup-png-response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ file?: string }> },
) {
  const { file } = await params
  const side = resolveLineupPngSide(file)
  const force = request.nextUrl.searchParams.get("refresh") === "true"

  try {
    return await createLineupPngResponse(side, force)
  } catch (error) {
    return createLineupPngErrorResponse(error)
  }
}

export const HEAD = GET
