import { createLineupTakumiResponse } from "@/app/api/lineup/takumi/route"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  return createLineupTakumiResponse(request)
}

export const HEAD = GET
