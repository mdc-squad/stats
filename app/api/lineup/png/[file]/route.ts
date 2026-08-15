import { createLineupTakumiResponse } from "@/app/api/lineup/takumi/route"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ file?: string }> },
) {
  const { file } = await params
  return createLineupTakumiResponse(request, file)
}

export const HEAD = GET
