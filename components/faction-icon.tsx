"use client"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { withBasePath } from "@/lib/base-path"
import { cn } from "@/lib/utils"

const FACTION_ICON_BY_KEY: Record<string, string> = {
  ADF: "ADF.png",
  AFU: "AFU.png",
  BAF: "BAF.png",
  CAF: "CAF.png",
  CRF: "CRF.png",
  GFI: "GFI.png",
  IMF: "IMF.png",
  MEA: "MEI.png",
  MEI: "MEI.png",
  PLA: "PLA.png",
  PLAAGF: "PLAAGF.png",
  "PLA AGF": "PLAAGF.png",
  PLANMC: "PLANMC.png",
  "PLA NMC": "PLANMC.png",
  RGF: "RGF.png",
  TLF: "TLF.png",
  USA: "USA.png",
  USMC: "USMC.png",
  VDV: "VDV.png",
  WPMC: "WPMC.png",
}

const CYRILLIC_LOOKALIKE_TO_LATIN: Record<string, string> = {
  А: "A",
  В: "B",
  Е: "E",
  К: "K",
  М: "M",
  Н: "H",
  О: "O",
  Р: "P",
  С: "C",
  Т: "T",
  У: "Y",
  Х: "X",
}

function normalizeFactionKey(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[АВЕКМНОРСТУХ]/g, (char) => CYRILLIC_LOOKALIKE_TO_LATIN[char] ?? char)
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function getFactionAbbr(value: string | null | undefined) {
  const normalized = normalizeFactionKey(value)
  if (!normalized) return ""
  if (normalized === "MEA") return "MEI"
  if (normalized === "PLA AGF") return "PLAAGF"
  if (normalized === "PLA NMC") return "PLANMC"
  return normalized
}

export function getFactionIconSrc(value: string | null | undefined) {
  const key = normalizeFactionKey(value)
  const fileName = FACTION_ICON_BY_KEY[key] ?? FACTION_ICON_BY_KEY[getFactionAbbr(value)]
  return fileName ? withBasePath(`/faction-icons/${fileName}`) : null
}

export function FactionIcon({
  faction,
  className,
  showLabel = false,
  disableTooltip = false,
}: {
  faction: string | null | undefined
  className?: string
  showLabel?: boolean
  disableTooltip?: boolean
}) {
  const abbr = getFactionAbbr(faction)
  const iconSrc = getFactionIconSrc(faction)

  if (!abbr) return null

  const content = (
    <span className={cn("inline-flex items-center gap-1.5 align-middle", className)}>
      {iconSrc ? (
        <img
          src={iconSrc}
          alt={abbr}
          className="h-4 w-7 shrink-0 rounded-[2px] border border-white/15 object-cover shadow-sm"
          loading="lazy"
        />
      ) : null}
      {showLabel || !iconSrc ? <span className="truncate">{abbr}</span> : null}
    </span>
  )

  if (showLabel || !iconSrc || disableTooltip) return content

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="top">{abbr}</TooltipContent>
    </Tooltip>
  )
}

export function FactionMatchup({
  value,
  faction1,
  faction2,
  className,
  separatorClassName,
  showLabels = false,
  disableTooltip = false,
}: {
  value?: string | null
  faction1?: string | null
  faction2?: string | null
  className?: string
  separatorClassName?: string
  showLabels?: boolean
  disableTooltip?: boolean
}) {
  const parts = value
    ? String(value).split(/\s+vs\s+/i).map((part) => part.trim()).filter(Boolean)
    : [faction1, faction2].map((part) => String(part ?? "").trim()).filter(Boolean)

  if (parts.length === 0) return null

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      {parts.map((part, index) => (
        <span key={`${part}-${index}`} className="inline-flex items-center gap-1.5">
          {index > 0 ? <span className={cn(separatorClassName ?? "text-muted-foreground")}>vs</span> : null}
          <FactionIcon faction={part} showLabel={showLabels} disableTooltip={disableTooltip} />
        </span>
      ))}
    </span>
  )
}
