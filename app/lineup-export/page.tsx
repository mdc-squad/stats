import { LineupExportShot } from "@/components/lineup-export-shot"

export default async function LineupExportPage({
  searchParams,
}: {
  searchParams: Promise<{ side?: string }>
}) {
  const params = await searchParams
  return <LineupExportShot side={params.side} />
}
