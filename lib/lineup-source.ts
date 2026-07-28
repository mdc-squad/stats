const DEFAULT_LINEUP_API_BASE = "https://api.hungryfishteam.org/gas/mdc"

export const EXTERNAL_LINEUP_API_URL = `${(process.env.NEXT_PUBLIC_MDC_API_BASE ?? DEFAULT_LINEUP_API_BASE).replace(/\/$/, "")}/lineup?publish=true`

export function getLineupDataUrl() {
  return "/api/lineup/data"
}
