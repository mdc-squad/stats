export type SquadToneKey =
  | "red"
  | "blue"
  | "green"
  | "yellow"
  | "orange"
  | "purple"
  | "pink"
  | "cyan"
  | "brown"
  | "black"
  | "white"
  | "neutral"

export type SquadIdentifier = number | string | null | undefined

function normalizeSquadToken(value: SquadIdentifier): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  if (typeof value === "string") {
    return value.trim()
  }

  return ""
}

export function getSquadLabel(squadNo: SquadIdentifier, squadDomain: string[] = []): string {
  const normalized = normalizeSquadToken(squadNo)
  if (!normalized) {
    return "Без отряда"
  }

  const domain = squadDomain.map((value) => value.trim()).filter(Boolean)
  const numericValue = Number(normalized)
  if (Number.isFinite(numericValue) && numericValue > 0 && String(Math.trunc(numericValue)) === normalized) {
    return domain[numericValue - 1] ?? `Сквад ${numericValue}`
  }

  const byKey = new Map(domain.map((value) => [value.toLowerCase(), value]))
  return byKey.get(normalized.toLowerCase()) ?? normalized
}

export function getSquadLabels(squadNos: SquadIdentifier[], squadDomain: string[] = []): string[] {
  return Array.from(
    new Set(
      squadNos
        .map((value) => normalizeSquadToken(value))
        .filter(Boolean)
        .map((value) => getSquadLabel(value, squadDomain)),
    ),
  )
}

export function getFactionMatchup(
  faction1: string | null | undefined,
  faction2: string | null | undefined,
): string | null {
  const left = faction1?.trim()
  const right = faction2?.trim()

  if (left && right) {
    return `${left} vs ${right}`
  }

  return left || right || null
}

export function getSquadToneKey(label: string | null | undefined): SquadToneKey {
  const normalized = (label ?? "").trim().toLowerCase()

  if (!normalized) return "neutral"
  if (normalized.includes("red") || normalized.includes("крас")) return "red"
  if (normalized.includes("blue") || normalized.includes("син")) return "blue"
  if (normalized.includes("green") || normalized.includes("зел")) return "green"
  if (normalized.includes("yellow") || normalized.includes("желт")) return "yellow"
  if (normalized.includes("orange") || normalized.includes("оранж")) return "orange"
  if (normalized.includes("purple") || normalized.includes("violet") || normalized.includes("фиол")) return "purple"
  if (normalized.includes("pink") || normalized.includes("роз")) return "pink"
  if (normalized.includes("cyan") || normalized.includes("teal") || normalized.includes("бирюз")) return "cyan"
  if (normalized.includes("brown") || normalized.includes("корич")) return "brown"
  if (normalized.includes("black") || normalized.includes("черн")) return "black"
  if (normalized.includes("white") || normalized.includes("бел")) return "white"

  return "neutral"
}

export function getSquadToneClasses(label: string | null | undefined): {
  badge: string
  panel: string
  dot: string
} {
  switch (getSquadToneKey(label)) {
    case "red":
      return {
        badge: "border-rose-500/40 bg-rose-500/10 text-rose-200",
        panel: "border-rose-500/20 bg-rose-500/10",
        dot: "bg-rose-400",
      }
    case "blue":
      return {
        badge: "border-sky-500/40 bg-sky-500/10 text-sky-200",
        panel: "border-sky-500/20 bg-sky-500/10",
        dot: "bg-sky-400",
      }
    case "green":
      return {
        badge: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
        panel: "border-emerald-500/20 bg-emerald-500/10",
        dot: "bg-emerald-400",
      }
    case "yellow":
      return {
        badge: "border-amber-500/40 bg-amber-500/10 text-amber-200",
        panel: "border-amber-500/20 bg-amber-500/10",
        dot: "bg-amber-400",
      }
    case "orange":
      return {
        badge: "border-orange-500/40 bg-orange-500/10 text-orange-200",
        panel: "border-orange-500/20 bg-orange-500/10",
        dot: "bg-orange-400",
      }
    case "purple":
      return {
        badge: "border-violet-500/40 bg-violet-500/10 text-violet-200",
        panel: "border-violet-500/20 bg-violet-500/10",
        dot: "bg-violet-400",
      }
    case "pink":
      return {
        badge: "border-pink-500/40 bg-pink-500/10 text-pink-200",
        panel: "border-pink-500/20 bg-pink-500/10",
        dot: "bg-pink-400",
      }
    case "cyan":
      return {
        badge: "border-cyan-500/40 bg-cyan-500/10 text-cyan-200",
        panel: "border-cyan-500/20 bg-cyan-500/10",
        dot: "bg-cyan-400",
      }
    case "brown":
      return {
        badge: "border-amber-700/40 bg-amber-900/20 text-amber-100",
        panel: "border-amber-700/20 bg-amber-900/15",
        dot: "bg-amber-600",
      }
    case "black":
      return {
        badge: "border-slate-500/40 bg-slate-800/60 text-slate-100",
        panel: "border-slate-500/20 bg-slate-800/40",
        dot: "bg-slate-300",
      }
    case "white":
      return {
        badge: "border-zinc-300/40 bg-zinc-100/10 text-zinc-100",
        panel: "border-zinc-300/20 bg-zinc-100/5",
        dot: "bg-zinc-200",
      }
    default:
      return {
        badge: "border-muted/40 bg-background/60 text-muted-foreground",
        panel: "border-border/50 bg-background/40",
        dot: "bg-muted-foreground",
      }
  }
}
