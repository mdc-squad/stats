"use client"

import React from "react"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PlayerAvatar } from "@/components/player-avatar"
import { RoleIcon } from "@/components/role-icon"
import { type Player, type PlayerEventStat } from "@/lib/data-utils"
import {
  Users,
  Shuffle,
  X,
  Plus,
  Minus,
  Shield,
  Heart,
  Car,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SquadBuilderProps {
  players: Player[]
  playerStats: PlayerEventStat[]
  roles?: string[]
}

type OptimizationCriteria = "kd" | "kda" | "revives" | "vehicle" | "kills" | "win_rate" | "balanced"

interface SquadSlot {
  player: Player | null
  role: string
  isLocked: boolean
  squadIndex: number
}

type RoleStatSummary = {
  kills: number
  deaths: number
  revives: number
  downs: number
  vehicle: number
  games: number
  kd: number
  kda: number
  killsPerGame: number
  revivesPerGame: number
  vehiclePerGame: number
}

const METADATA_STOPWORDS = [
  "accepted",
  "declined",
  "tentative",
  "created by",
  "countdown",
  "add to google",
  "играем",
  "формат",
  "карта",
  "фракции",
  "сервер",
  "skirmish",
]

function normalizeRoleKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9а-яё]/gi, "")
}

function normalizeNickname(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-z0-9а-я]/gi, "")
}

function isVehicleRole(role: string): boolean {
  const normalized = normalizeRoleKey(role)
  return (
    normalized === normalizeRoleKey("LAT") ||
    normalized === normalizeRoleKey("HAT") ||
    normalized === normalizeRoleKey("Тандем")
  )
}

function getRolePriority(role: string): number {
  const normalized = normalizeRoleKey(role)

  if (
    normalized === normalizeRoleKey("SL") ||
    normalized === normalizeRoleKey("SL Крюмен") ||
    normalized === normalizeRoleKey("SL Пилот")
  ) {
    return 5
  }

  if (normalized === normalizeRoleKey("Медик")) {
    return 4
  }

  if (isVehicleRole(role)) {
    return 3
  }

  if (
    normalized === normalizeRoleKey("ГП") ||
    normalized === normalizeRoleKey("Инженер") ||
    normalized === normalizeRoleKey("Сапёр")
  ) {
    return 2
  }

  return 1
}

function getRoleReliability(games: number): number {
  if (!Number.isFinite(games) || games <= 0) {
    return 0.7
  }

  return 0.7 + (Math.min(games, 6) / 6) * 0.3
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  values.forEach((value) => {
    const trimmed = value.trim()
    if (!trimmed || seen.has(trimmed)) {
      return
    }

    seen.add(trimmed)
    result.push(trimmed)
  })

  return result
}

function isLikelyNicknameToken(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false

  const lower = trimmed.toLowerCase()
  if (lower.startsWith("http")) return false
  if (trimmed.includes("[") && lower.includes("add to google")) return false
  if (trimmed.includes(":")) {
    const markerLine = lower.startsWith(":") || lower.includes(":countdown:") || lower.includes(":authority:")
    if (markerLine) return false
  }

  if (METADATA_STOPWORDS.some((word) => lower.includes(word))) {
    return false
  }

  const normalized = normalizeNickname(trimmed)
  return normalized.length >= 3
}

function cleanNicknameToken(rawLine: string): string {
  return rawLine
    .replace(/^[\s>*\-•]+/g, "")
    .replace(/^[0-9]+[.)\s-]+/, "")
    .trim()
}

function extractAcceptedNicknameTokens(raw: string): string[] {
  if (!raw.trim()) return []

  const lines = raw.split(/\r?\n/)
  let insideAccepted = false
  const acceptedLines: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      continue
    }

    const lower = trimmed.toLowerCase()
    if (lower.includes(":accepted:")) {
      insideAccepted = true
      continue
    }

    if (!insideAccepted) {
      continue
    }

    if (lower.includes(":declined:") || lower.includes(":tentative:") || lower.startsWith("created by")) {
      break
    }

    const candidate = cleanNicknameToken(trimmed)
    if (isLikelyNicknameToken(candidate)) {
      acceptedLines.push(candidate)
    }
  }

  return uniqueStrings(acceptedLines)
}

function extractNicknameTokens(raw: string): string[] {
  if (!raw.trim()) return []

  const acceptedTokens = extractAcceptedNicknameTokens(raw)
  if (acceptedTokens.length > 0) {
    return acceptedTokens
  }

  const directTokens = raw
    .split(/[\n,]/)
    .map((line) => cleanNicknameToken(line))
    .filter((line) => isLikelyNicknameToken(line))

  return uniqueStrings(directTokens)
}

function nicknameMatches(playerNickname: string, rawToken: string): boolean {
  const playerKey = normalizeNickname(playerNickname)
  const tokenKey = normalizeNickname(rawToken)

  if (!playerKey || !tokenKey) {
    return false
  }

  return playerKey === tokenKey || playerKey.includes(tokenKey) || tokenKey.includes(playerKey)
}

function buildRoleStatsIndex(playerStats: PlayerEventStat[]): Map<string, Map<string, RoleStatSummary>> {
  const index = new Map<string, Map<string, RoleStatSummary>>()

  playerStats.forEach((stat) => {
    const roleKey = normalizeRoleKey(stat.role)
    if (!stat.player_id || !roleKey) {
      return
    }

    let byRole = index.get(stat.player_id)
    if (!byRole) {
      byRole = new Map<string, RoleStatSummary>()
      index.set(stat.player_id, byRole)
    }

    const current = byRole.get(roleKey) ?? {
      kills: 0,
      deaths: 0,
      revives: 0,
      downs: 0,
      vehicle: 0,
      games: 0,
      kd: 0,
      kda: 0,
      killsPerGame: 0,
      revivesPerGame: 0,
      vehiclePerGame: 0,
    }

    current.kills += stat.kills
    current.deaths += stat.deaths
    current.revives += stat.revives
    current.downs += stat.downs
    current.vehicle += stat.vehicle
    current.games += 1
    byRole.set(roleKey, current)
  })

  index.forEach((byRole) => {
    byRole.forEach((summary, roleKey) => {
      const games = Math.max(1, summary.games)
      byRole.set(roleKey, {
        ...summary,
        kd: summary.deaths > 0 ? summary.kills / summary.deaths : summary.kills,
        kda: summary.deaths > 0 ? summary.downs / summary.deaths : summary.downs,
        killsPerGame: summary.kills / games,
        revivesPerGame: summary.revives / games,
        vehiclePerGame: summary.vehicle / games,
      })
    })
  })

  return index
}

function getPlayerRoleStats(index: Map<string, Map<string, RoleStatSummary>>, playerId: string, role: string): RoleStatSummary | null {
  const roleKey = normalizeRoleKey(role)
  if (!roleKey) return null

  const byRole = index.get(playerId)
  if (!byRole) return null

  return byRole.get(roleKey) ?? null
}

function getPlayerScore(
  player: Player,
  criteria: OptimizationCriteria,
  role: string,
  roleStatsIndex: Map<string, Map<string, RoleStatSummary>>,
): number {
  const roleStats = getPlayerRoleStats(roleStatsIndex, player.player_id, role)
  const reliability = getRoleReliability(roleStats?.games ?? 0)
  const events = Math.max(player.totals.events, 1)

  const killsPerGame = roleStats?.killsPerGame ?? player.totals.kills / events
  const revivesPerGame = roleStats?.revivesPerGame ?? player.totals.revives / events
  const vehiclePerGame = roleStats?.vehiclePerGame ?? player.totals.vehicle / events

  return {
    kd: (roleStats?.kd ?? player.totals.kd) * reliability,
    kda: (roleStats?.kda ?? player.totals.kda) * reliability,
    revives: revivesPerGame * reliability,
    vehicle: vehiclePerGame * reliability,
    kills: killsPerGame * reliability,
    win_rate: player.totals.win_rate,
    balanced: (() => {
      const kdNorm = Math.min((roleStats?.kd ?? player.totals.kd) / 2.5, 1)
      const kdaNorm = Math.min((roleStats?.kda ?? player.totals.kda) / 3.5, 1)
      const winNorm = Math.min(player.totals.win_rate, 1)
      const utilityNorm = isVehicleRole(role)
        ? Math.min(vehiclePerGame / 1.5, 1)
        : normalizeRoleKey(role) === normalizeRoleKey("Медик")
          ? Math.min(revivesPerGame / 4, 1)
          : Math.min(killsPerGame / 12, 1)
      const experienceNorm = Math.min((roleStats?.games ?? player.totals.events) / 8, 1)

      return kdNorm * 0.3 + kdaNorm * 0.2 + winNorm * 0.2 + utilityNorm * 0.2 + experienceNorm * 0.1
    })(),
  }[criteria] ?? player.totals.kd
}

function getStatColor(value: number, avg: number) {
  if (!Number.isFinite(value)) return "text-muted-foreground"

  const safeAvg = Math.max(avg, 0.0001)
  const ratio = value / safeAvg
  if (ratio < 0.9) return "text-red-400"
  if (ratio < 1.05) return "text-orange-400"
  if (ratio < 1.25) return "text-yellow-400"
  return "text-green-400"
}

function shuffledArray<T>(items: T[]): T[] {
  const next = [...items]

  for (let i = next.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1))
    const temp = next[i]
    next[i] = next[randomIndex]
    next[randomIndex] = temp
  }

  return next
}

function buildSquadLoadIndex(
  slots: SquadSlot[],
  criteria: OptimizationCriteria,
  roleStatsIndex: Map<string, Map<string, RoleStatSummary>>,
): Map<number, number> {
  const load = new Map<number, number>()

  slots.forEach((slot) => {
    if (!slot.player) return

    const score = getPlayerScore(slot.player, criteria, slot.role, roleStatsIndex)
    load.set(slot.squadIndex, (load.get(slot.squadIndex) ?? 0) + score)
  })

  return load
}

function buildInitialSlots(
  squadSizes: number[],
  requiredRoles: string[],
  defaultRifleRole: string,
): SquadSlot[] {
  const safeRequiredRoles = requiredRoles.filter((role) => role.trim().length > 0)
  const slots: SquadSlot[] = []

  squadSizes.forEach((rawSize, squadIndex) => {
    const squadSize = Math.max(1, Math.min(9, rawSize))

    for (let i = 0; i < Math.min(safeRequiredRoles.length, squadSize); i++) {
      slots.push({
        player: null,
        role: safeRequiredRoles[i],
        isLocked: false,
        squadIndex,
      })
    }

    for (let i = Math.min(safeRequiredRoles.length, squadSize); i < squadSize; i++) {
      slots.push({
        player: null,
        role: defaultRifleRole,
        isLocked: false,
        squadIndex,
      })
    }
  })

  return slots
}

function computeAdaptiveSquadPlan(totalPlayers: number, desiredSize: number, desiredSquads: number): number[] {
  const safeDesiredSize = Math.max(1, Math.min(9, desiredSize))
  const safeDesiredSquads = Math.max(1, desiredSquads)

  if (totalPlayers <= 0) {
    return Array.from({ length: safeDesiredSquads }, () => safeDesiredSize)
  }

  const minSquads = Math.max(1, Math.ceil(totalPlayers / 9))
  const maxSquads = Math.min(totalPlayers, Math.max(safeDesiredSquads + 4, minSquads + 4))

  let bestSquadCount = minSquads
  let bestScore = Number.POSITIVE_INFINITY

  for (let squadCount = minSquads; squadCount <= maxSquads; squadCount++) {
    const averageSize = totalPlayers / squadCount
    if (averageSize < 1 || averageSize > 9) continue

    const score = Math.abs(squadCount - safeDesiredSquads) * 1.2 + Math.abs(averageSize - safeDesiredSize)
    if (score < bestScore) {
      bestScore = score
      bestSquadCount = squadCount
    }
  }

  const baseSize = Math.floor(totalPlayers / bestSquadCount)
  const extraPlayers = totalPlayers % bestSquadCount

  return Array.from({ length: bestSquadCount }, (_, index) => {
    const candidate = baseSize + (index < extraPlayers ? 1 : 0)
    return Math.max(1, Math.min(9, candidate))
  })
}

function fillSlotsWithPlayers(params: {
  sourceSlots: SquadSlot[]
  availablePlayers: Player[]
  optimizationCriteria: OptimizationCriteria
  roleStatsIndex: Map<string, Map<string, RoleStatSummary>>
}): SquadSlot[] {
  const { sourceSlots, availablePlayers, optimizationCriteria, roleStatsIndex } = params
  if (sourceSlots.length === 0) return sourceSlots

  const newSlots = sourceSlots.map((slot) => (slot.isLocked ? { ...slot } : { ...slot, player: null }))

  const usedPlayerIds = new Set(
    newSlots
      .filter((slot) => slot.isLocked && slot.player)
      .map((slot) => slot.player!.player_id),
  )

  let remainingPlayers = availablePlayers.filter((player) => !usedPlayerIds.has(player.player_id))

  const unlockedIndexes = newSlots
    .map((slot, index) => ({ slot, index }))
    .filter(({ slot }) => !slot.isLocked)
    .map(({ index }) => index)

  while (remainingPlayers.length > 0 && unlockedIndexes.length > 0) {
    const rankedSlots = unlockedIndexes
      .map((slotIndex) => {
        const role = newSlots[slotIndex].role
        const roleKnownCandidates = remainingPlayers.filter((player) => {
          const roleStats = getPlayerRoleStats(roleStatsIndex, player.player_id, role)
          return (roleStats?.games ?? 0) > 0
        }).length

        const bestScore = remainingPlayers.reduce((maxScore, player) => {
          const score = getPlayerScore(player, optimizationCriteria, role, roleStatsIndex)
          return Math.max(maxScore, score)
        }, Number.NEGATIVE_INFINITY)

        return {
          slotIndex,
          squadIndex: newSlots[slotIndex].squadIndex,
          role,
          roleKnownCandidates,
          rolePriority: getRolePriority(role),
          bestScore,
        }
      })
      .sort((left, right) => {
        if (left.roleKnownCandidates !== right.roleKnownCandidates) {
          return left.roleKnownCandidates - right.roleKnownCandidates
        }
        if (left.rolePriority !== right.rolePriority) {
          return right.rolePriority - left.rolePriority
        }
        return right.bestScore - left.bestScore
      })

    const targetSlot = rankedSlots[0]
    if (!targetSlot) break

    const hasKnownPlayersForRole = remainingPlayers.some((player) => {
      const roleStats = getPlayerRoleStats(roleStatsIndex, player.player_id, targetSlot.role)
      return (roleStats?.games ?? 0) > 0
    })

    const sortedPlayers = [...remainingPlayers]
      .map((player) => {
        const roleStats = getPlayerRoleStats(roleStatsIndex, player.player_id, targetSlot.role)
        const roleGames = roleStats?.games ?? 0
        const score = getPlayerScore(player, optimizationCriteria, targetSlot.role, roleStatsIndex)

        return {
          player,
          roleGames,
          score,
        }
      })
      .sort((left, right) => {
        if (hasKnownPlayersForRole) {
          const leftHasRole = left.roleGames > 0 ? 1 : 0
          const rightHasRole = right.roleGames > 0 ? 1 : 0
          if (rightHasRole !== leftHasRole) {
            return rightHasRole - leftHasRole
          }
        }

        if (right.score !== left.score) {
          return right.score - left.score
        }

        if (right.roleGames !== left.roleGames) {
          return right.roleGames - left.roleGames
        }

        return right.player.totals.events - left.player.totals.events
      })

    const squadLoads = buildSquadLoadIndex(newSlots, optimizationCriteria, roleStatsIndex)
    const squadIndexes = uniqueStrings(newSlots.map((slot) => String(slot.squadIndex))).map((value) => Number(value))

    const minLoad = squadIndexes.length
      ? Math.min(...squadIndexes.map((squadIndex) => squadLoads.get(squadIndex) ?? 0))
      : 0
    const maxLoad = squadIndexes.length
      ? Math.max(...squadIndexes.map((squadIndex) => squadLoads.get(squadIndex) ?? 0))
      : 0
    const currentTargetLoad = squadLoads.get(targetSlot.squadIndex) ?? 0

    const candidatePool = shuffledArray(sortedPlayers.slice(0, Math.min(6, sortedPlayers.length)))

    let selectedPlayer: Player | null = null
    let bestCandidateScore = Number.NEGATIVE_INFINITY

    candidatePool.forEach((candidate) => {
      const candidateRoleScore = candidate.score
      const projectedLoad = currentTargetLoad + candidateRoleScore
      const imbalancePenalty = projectedLoad - minLoad
      const spreadPenalty = Math.max(projectedLoad, maxLoad) - minLoad
      const roleHistoryPenalty = hasKnownPlayersForRole && candidate.roleGames === 0 ? 0.65 : 0
      const shuffleBonus = Math.random() * 0.03

      const candidateScore =
        candidateRoleScore - imbalancePenalty * 0.08 - spreadPenalty * 0.03 - roleHistoryPenalty + shuffleBonus
      if (candidateScore > bestCandidateScore) {
        bestCandidateScore = candidateScore
        selectedPlayer = candidate.player
      }
    })

    const bestPlayer = selectedPlayer ?? sortedPlayers[0]?.player
    if (!bestPlayer) break

    newSlots[targetSlot.slotIndex].player = bestPlayer
    remainingPlayers = remainingPlayers.filter((player) => player.player_id !== bestPlayer.player_id)

    const unlockedPosition = unlockedIndexes.indexOf(targetSlot.slotIndex)
    if (unlockedPosition >= 0) {
      unlockedIndexes.splice(unlockedPosition, 1)
    }
  }

  return newSlots
}

function formatSquadSizes(sizes: number[]): string {
  if (sizes.length === 0) return "-"
  return sizes.join(" / ")
}

function formatSquadCountLabel(count: number): string {
  const mod10 = count % 10
  const mod100 = count % 100

  if (mod10 === 1 && mod100 !== 11) {
    return `${count} сквад`
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${count} сквада`
  }

  return `${count} сквадов`
}

export function SquadBuilder({ players, playerStats, roles = [] }: SquadBuilderProps) {
  const [squadSize, setSquadSize] = useState(9)
  const [squadCount, setSquadCount] = useState(1)
  const [slots, setSlots] = useState<SquadSlot[]>([])
  const [availableNicknames, setAvailableNicknames] = useState<string>("")
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([])
  const [playerPickerQuery, setPlayerPickerQuery] = useState("")
  const [showPlayerPicker, setShowPlayerPicker] = useState(false)
  const [optimizationCriteria, setOptimizationCriteria] = useState<OptimizationCriteria>("balanced")
  const [requiredRoles, setRequiredRoles] = useState<string[]>(["SL", "Медик", "Стрелок"])
  const [showSettings, setShowSettings] = useState(true)
  const [generationSummary, setGenerationSummary] = useState("")

  const roleOptions = useMemo(() => {
    const byKey = new Map<string, string>()

    requiredRoles
      .map((role) => role.trim())
      .filter(Boolean)
      .forEach((role) => {
        const key = normalizeRoleKey(role)
        if (key && !byKey.has(key)) {
          byKey.set(key, role)
        }
      })

    roles
      .map((role) => role.trim())
      .filter(Boolean)
      .forEach((role) => {
        const key = normalizeRoleKey(role)
        if (key && !byKey.has(key)) {
          byKey.set(key, role)
        }
      })

    playerStats
      .map((stat) => stat.role?.trim() ?? "")
      .filter(Boolean)
      .forEach((role) => {
        const key = normalizeRoleKey(role)
        if (key && !byKey.has(key)) {
          byKey.set(key, role)
        }
      })

    return Array.from(byKey.values())
  }, [requiredRoles, roles, playerStats])

  const defaultRifleRole = useMemo(() => {
    const rifleRole = roleOptions.find((role) => normalizeRoleKey(role) === normalizeRoleKey("Стрелок"))
    return rifleRole ?? roleOptions[0] ?? "Стрелок"
  }, [roleOptions])

  const roleStatsIndex = useMemo(() => buildRoleStatsIndex(playerStats), [playerStats])

  const parsedNicknameTokens = useMemo(() => extractNicknameTokens(availableNicknames), [availableNicknames])

  const textMatchedPlayers = useMemo(() => {
    if (parsedNicknameTokens.length === 0) return []

    return players.filter((player) =>
      parsedNicknameTokens.some((token) => nicknameMatches(player.nickname, token)),
    )
  }, [players, parsedNicknameTokens])

  const matchedTokenCount = useMemo(() => {
    if (parsedNicknameTokens.length === 0) return 0

    return parsedNicknameTokens.filter((token) =>
      players.some((player) => nicknameMatches(player.nickname, token)),
    ).length
  }, [players, parsedNicknameTokens])

  const selectedPlayerIdSet = useMemo(() => new Set(selectedPlayerIds), [selectedPlayerIds])

  const availablePlayers = useMemo(() => {
    if (selectedPlayerIds.length === 0 && parsedNicknameTokens.length === 0) {
      return players
    }

    const allowedIds = new Set(selectedPlayerIds)
    textMatchedPlayers.forEach((player) => allowedIds.add(player.player_id))

    return players.filter((player) => allowedIds.has(player.player_id))
  }, [players, parsedNicknameTokens.length, selectedPlayerIds, textMatchedPlayers])

  const desiredTotalSlots = squadSize * squadCount

  const slotsBySquad = useMemo(() => {
    const grouped = new Map<number, Array<{ slot: SquadSlot; index: number }>>()

    slots.forEach((slot, index) => {
      const current = grouped.get(slot.squadIndex) ?? []
      current.push({ slot, index })
      grouped.set(slot.squadIndex, current)
    })

    return Array.from(grouped.entries())
      .sort(([left], [right]) => left - right)
      .map(([squadIndex, items]) => ({ squadIndex, items }))
  }, [slots])

  const currentSquadSizes = useMemo(
    () => slotsBySquad.map(({ items }) => items.length),
    [slotsBySquad],
  )

  const filledSlotsCount = useMemo(() => slots.filter((slot) => !!slot.player).length, [slots])
  const freeSlotsCount = Math.max(0, slots.length - filledSlotsCount)

  const filteredPickerPlayers = useMemo(() => {
    const query = playerPickerQuery.trim().toLowerCase()
    if (!query) return players

    return players.filter((player) => player.nickname.toLowerCase().includes(query))
  }, [players, playerPickerQuery])

  const initializeSlots = () => {
    const sizes = Array.from({ length: squadCount }, () => squadSize)
    const newSlots = buildInitialSlots(sizes, requiredRoles, defaultRifleRole)
    setSlots(newSlots)
    setGenerationSummary(`Создано ${sizes.length} сквад(а). Размеры: ${formatSquadSizes(sizes)}.`)
  }

  const applyDimensionToExistingSlots = () => {
    if (slots.length === 0) {
      initializeSlots()
      return
    }

    const targetSizes = Array.from({ length: squadCount }, () => squadSize)
    const grouped = new Map<number, SquadSlot[]>()

    slots.forEach((slot) => {
      const current = grouped.get(slot.squadIndex) ?? []
      current.push(slot)
      grouped.set(slot.squadIndex, current)
    })

    const nextSlots: SquadSlot[] = []

    targetSizes.forEach((targetSize, squadIndex) => {
      const existing = [...(grouped.get(squadIndex) ?? [])]

      let keptSlots = existing
      if (existing.length > targetSize) {
        const keepPositions = new Set(
          existing
            .map((slot, index) => ({
              index,
              score: (slot.isLocked ? 100 : 0) + (slot.player ? 10 : 0),
            }))
            .sort((left, right) => {
              if (left.score !== right.score) {
                return right.score - left.score
              }
              return left.index - right.index
            })
            .slice(0, targetSize)
            .map((item) => item.index),
        )

        keptSlots = existing.filter((_, index) => keepPositions.has(index))
      }

      keptSlots.forEach((slot) => {
        nextSlots.push({ ...slot, squadIndex })
      })

      for (let i = keptSlots.length; i < targetSize; i++) {
        nextSlots.push({
          player: null,
          role: defaultRifleRole,
          isLocked: false,
          squadIndex,
        })
      }
    })

    setSlots(nextSlots)
    setGenerationSummary(
      `Размерность применена. Сквадов: ${targetSizes.length}, слотов: ${nextSlots.length}.`,
    )
  }

  const autoFillSquad = () => {
    if (slots.length === 0 || availablePlayers.length === 0) return

    const newSlots = fillSlotsWithPlayers({
      sourceSlots: slots,
      availablePlayers,
      optimizationCriteria,
      roleStatsIndex,
    })

    setSlots(newSlots)
    setGenerationSummary(`Автозаполнение завершено: ${newSlots.filter((slot) => slot.player).length}/${newSlots.length}.`)
  }

  const buildBalancedSquads = () => {
    if (availablePlayers.length === 0) {
      setGenerationSummary("Нет доступных игроков для генерации.")
      return
    }

    const adaptiveSizes = computeAdaptiveSquadPlan(availablePlayers.length, squadSize, squadCount)
    const baseSlots = buildInitialSlots(adaptiveSizes, requiredRoles, defaultRifleRole)

    const filled = fillSlotsWithPlayers({
      sourceSlots: baseSlots,
      availablePlayers,
      optimizationCriteria,
      roleStatsIndex,
    })

    setSlots(filled)
    setGenerationSummary(
      `Сбалансировано по доступным игрокам: ${adaptiveSizes.length} сквад(а), размеры ${formatSquadSizes(adaptiveSizes)}.`,
    )
  }

  const clearUnlockedSlots = () => {
    setSlots(slots.map((slot) => (slot.isLocked ? slot : { ...slot, player: null })))
  }

  const toggleLock = (index: number) => {
    const newSlots = [...slots]
    newSlots[index].isLocked = !newSlots[index].isLocked
    setSlots(newSlots)
  }

  const changeRole = (index: number, role: string) => {
    const newSlots = [...slots]
    newSlots[index].role = role
    setSlots(newSlots)
  }

  const assignPlayer = (index: number, player: Player | null) => {
    if (
      player &&
      slots.some(
        (slot, slotIndex) => slotIndex !== index && slot.player?.player_id === player.player_id,
      )
    ) {
      return
    }

    const newSlots = [...slots]
    newSlots[index].player = player
    setSlots(newSlots)
  }

  const removePlayer = (index: number) => {
    const newSlots = [...slots]
    newSlots[index].player = null
    newSlots[index].isLocked = false
    setSlots(newSlots)
  }

  const removeSlot = (index: number) => {
    setSlots((prevSlots) => prevSlots.filter((_, currentIndex) => currentIndex !== index))
  }

  const addSlotToSquad = (squadIndex: number) => {
    setSlots((prevSlots) => {
      const squadSlotsCount = prevSlots.filter((slot) => slot.squadIndex === squadIndex).length
      if (squadSlotsCount >= 9) {
        return prevSlots
      }

      return [
        ...prevSlots,
        {
          player: null,
          role: defaultRifleRole,
          isLocked: false,
          squadIndex,
        },
      ]
    })
  }

  const removeOneSlotFromSquad = (squadIndex: number) => {
    setSlots((prevSlots) => {
      const entries = prevSlots
        .map((slot, index) => ({ slot, index }))
        .filter((entry) => entry.slot.squadIndex === squadIndex)

      if (entries.length <= 1) {
        return prevSlots
      }

      const removable = [...entries]
        .sort((left, right) => {
          const leftScore = (left.slot.isLocked ? 100 : 0) + (left.slot.player ? 10 : 0)
          const rightScore = (right.slot.isLocked ? 100 : 0) + (right.slot.player ? 10 : 0)

          if (leftScore !== rightScore) {
            return leftScore - rightScore
          }

          return right.index - left.index
        })[0]

      if (!removable) return prevSlots

      return prevSlots.filter((_, index) => index !== removable.index)
    })
  }

  const addRequiredRole = (role: string) => {
    setRequiredRoles([...requiredRoles, role])
  }

  const removeRequiredRole = (index: number) => {
    setRequiredRoles(requiredRoles.filter((_, currentIndex) => currentIndex !== index))
  }

  const toggleManualPlayer = (playerId: string, checked: boolean) => {
    setSelectedPlayerIds((prevIds) => {
      if (checked) {
        if (prevIds.includes(playerId)) return prevIds
        return [...prevIds, playerId]
      }

      return prevIds.filter((currentId) => currentId !== playerId)
    })
  }

  const importAcceptedPlayers = () => {
    const acceptedTokens = extractAcceptedNicknameTokens(availableNicknames)
    if (acceptedTokens.length === 0) {
      setGenerationSummary("В тексте не найден блок Accepted с никами.")
      return
    }

    const matchedIds = players
      .filter((player) => acceptedTokens.some((token) => nicknameMatches(player.nickname, token)))
      .map((player) => player.player_id)

    if (matchedIds.length === 0) {
      setGenerationSummary("Блок Accepted распознан, но совпадений с базой игроков нет.")
      return
    }

    setSelectedPlayerIds((prevIds) => Array.from(new Set([...prevIds, ...matchedIds])))
    setGenerationSummary(`Из блока Accepted добавлено ${matchedIds.length} игроков.`)
  }

  const clearPlayerFilters = () => {
    setAvailableNicknames("")
    setSelectedPlayerIds([])
    setPlayerPickerQuery("")
    setGenerationSummary("Фильтры игроков очищены. Доступны все игроки.")
  }

  const squadStats = useMemo(() => {
    const filledSlots = slots.filter((slot) => slot.player)
    if (filledSlots.length === 0) return null

    const totalKills = filledSlots.reduce((sum, slot) => sum + (slot.player?.totals.kills || 0), 0)
    const totalDeaths = filledSlots.reduce((sum, slot) => sum + (slot.player?.totals.deaths || 0), 0)
    const totalRevives = filledSlots.reduce((sum, slot) => sum + (slot.player?.totals.revives || 0), 0)
    const totalVehicle = filledSlots.reduce((sum, slot) => sum + (slot.player?.totals.vehicle || 0), 0)
    const avgKD =
      filledSlots.reduce((sum, slot) => sum + (slot.player?.totals.kd || 0), 0) / filledSlots.length
    const avgWinRate =
      filledSlots.reduce((sum, slot) => sum + (slot.player?.totals.win_rate || 0), 0) / filledSlots.length

    return {
      players: filledSlots.length,
      totalKills,
      totalDeaths,
      totalRevives,
      totalVehicle,
      avgKD,
      avgWinRate,
      squadKD: totalDeaths > 0 ? totalKills / totalDeaths : totalKills,
    }
  }, [slots])

  return (
    <div className="space-y-4">
      <Card className="border-christmas-gold/20">
        <CardHeader
          className="cursor-pointer flex flex-row items-center justify-between"
          onClick={() => setShowSettings(!showSettings)}
        >
          <CardTitle className="text-base text-christmas-snow flex items-center gap-2">
            <Users className="w-4 h-4" />
            Настройки сквадов
          </CardTitle>
          {showSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </CardHeader>

        {showSettings && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-christmas-snow">
                Доступные игроки (ники через запятую/строки или полный копипаст анонса)
              </Label>
              <textarea
                className="w-full h-28 p-2 rounded-md bg-secondary/50 border border-christmas-gold/20 text-christmas-snow text-sm resize-y"
                placeholder="Вставьте список ников или полный блок SKIRMISH с секцией :accepted:"
                value={availableNicknames}
                onChange={(e) => setAvailableNicknames(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-christmas-gold/30 text-christmas-snow"
                  onClick={importAcceptedPlayers}
                  disabled={!availableNicknames.trim()}
                >
                  Импортировать Accepted
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={clearPlayerFilters}
                >
                  Сбросить фильтры
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Распознано строк: {parsedNicknameTokens.length}, совпало игроков: {textMatchedPlayers.length},
                не найдено: {Math.max(parsedNicknameTokens.length - matchedTokenCount, 0)}.
              </p>
              <p className="text-xs text-muted-foreground">
                Доступно игроков после фильтрации: {availablePlayers.length} из {players.length}.
              </p>
            </div>

            <div className="space-y-2 rounded-md border border-christmas-gold/20 bg-secondary/15 p-3">
              <div className="flex items-center justify-between">
                <Label className="text-christmas-snow">Ручной выбор игроков</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPlayerPicker((value) => !value)}
                >
                  {showPlayerPicker ? "Скрыть" : "Показать"}
                </Button>
              </div>

              {showPlayerPicker && (
                <>
                  <input
                    className="w-full rounded-md bg-secondary/50 border border-christmas-gold/20 px-2 py-1.5 text-sm text-christmas-snow"
                    placeholder="Поиск игрока..."
                    value={playerPickerQuery}
                    onChange={(e) => setPlayerPickerQuery(e.target.value)}
                  />
                  <ScrollArea className="h-40 rounded-md border border-christmas-gold/20 bg-background/40 p-2">
                    <div className="space-y-1">
                      {filteredPickerPlayers.map((player) => (
                        <label
                          key={player.player_id}
                          className="flex cursor-pointer items-center justify-between gap-2 rounded px-2 py-1 hover:bg-secondary/30"
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <Checkbox
                              checked={selectedPlayerIdSet.has(player.player_id)}
                              onCheckedChange={(checked) =>
                                toggleManualPlayer(player.player_id, checked === true)
                              }
                            />
                            <span className="truncate text-sm text-christmas-snow">{player.nickname}</span>
                          </span>
                          <span className="text-xs text-muted-foreground">{player.totals.events} игр</span>
                        </label>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}

              <p className="text-xs text-muted-foreground">
                Выбрано вручную: {selectedPlayerIds.length}. Ручной выбор объединяется с импортом из текста.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-christmas-snow">Желаемый размер сквада</Label>
                <Select value={String(squadSize)} onValueChange={(value) => setSquadSize(Number(value))}>
                  <SelectTrigger className="bg-secondary/50 border-christmas-gold/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size} человек
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-christmas-snow">Желаемое число сквадов</Label>
                <Select value={String(squadCount)} onValueChange={(value) => setSquadCount(Number(value))}>
                  <SelectTrigger className="bg-secondary/50 border-christmas-gold/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((count) => (
                      <SelectItem key={count} value={String(count)}>
                        {formatSquadCountLabel(count)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-christmas-snow">Оптимизация</Label>
                <Select
                  value={optimizationCriteria}
                  onValueChange={(value) => setOptimizationCriteria(value as OptimizationCriteria)}
                >
                  <SelectTrigger className="bg-secondary/50 border-christmas-gold/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="balanced">Сбалансированный</SelectItem>
                    <SelectItem value="kd">Максимум K/D</SelectItem>
                    <SelectItem value="kda">Максимум KDA</SelectItem>
                    <SelectItem value="kills">Максимум убийств</SelectItem>
                    <SelectItem value="revives">Максимум поднятий</SelectItem>
                    <SelectItem value="vehicle">Максимум техники</SelectItem>
                    <SelectItem value="win_rate">Максимум винрейта</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="text-xs text-muted-foreground rounded-md border border-christmas-gold/20 bg-secondary/20 px-3 py-2">
              Текущая цель: {squadCount} сквад(а) по {squadSize} ({desiredTotalSlots} мест).
              Режим «Сбалансировать из доступных» может автоматически менять размер сквадов и их число,
              чтобы ровнее разложить фактически доступных игроков.
            </p>

            {availablePlayers.length < desiredTotalSlots && (
              <p className="text-xs text-amber-300">
                Для полной целевой размерности не хватает игроков: нужно {desiredTotalSlots}, доступно {availablePlayers.length}.
              </p>
            )}

            <div className="space-y-2">
              <Label className="text-christmas-snow">Обязательные роли (шаблон каждого сквада)</Label>
              <div className="flex flex-wrap gap-2">
                {requiredRoles.map((role, index) => (
                  <div key={`${role}-${index}`} className="flex items-center">
                    <Badge variant="secondary" className="rounded-r-none border-r-0 flex items-center gap-1">
                      <RoleIcon role={role} />
                      {role}
                    </Badge>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-6 rounded-l-none px-2 hover:bg-destructive/20"
                      onClick={() => removeRequiredRole(index)}
                      title="Убрать роль из шаблона"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                <Select onValueChange={addRequiredRole}>
                  <SelectTrigger className="w-[130px] h-6 bg-secondary/50 border-christmas-gold/20">
                    <Plus className="w-3 h-3 mr-1" />
                    <span className="text-xs">Добавить</span>
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((role) => (
                      <SelectItem key={role} value={role}>
                        <span className="flex items-center gap-2">
                          <RoleIcon role={role} />
                          {role}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                В шаблоне: {requiredRoles.length} роли. После генерации можно удалять и добавлять слоты вручную в каждом скваде.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={initializeSlots}
                variant="outline"
                className="border-christmas-gold/30 text-christmas-snow bg-transparent"
              >
                <Users className="w-4 h-4 mr-2" />
                Создать слоты
              </Button>

              <Button
                onClick={applyDimensionToExistingSlots}
                variant="outline"
                className="border-christmas-gold/30 text-christmas-snow bg-transparent"
                disabled={slots.length === 0}
              >
                Применить размерность
              </Button>

              <Button
                onClick={autoFillSquad}
                className="bg-christmas-green hover:bg-christmas-green/80"
                disabled={slots.length === 0 || availablePlayers.length === 0}
              >
                <Shuffle className="w-4 h-4 mr-2" />
                Автозаполнение
              </Button>

              <Button
                onClick={buildBalancedSquads}
                variant="outline"
                className="border-christmas-gold/30 text-christmas-snow bg-transparent"
                disabled={availablePlayers.length === 0}
              >
                <Shuffle className="w-4 h-4 mr-2" />
                Сбалансировать из доступных
              </Button>

              <Button onClick={clearUnlockedSlots} variant="destructive" disabled={slots.length === 0}>
                <X className="w-4 h-4 mr-2" />
                Очистить незалоченные
              </Button>
            </div>

            {generationSummary && <p className="text-xs text-muted-foreground">{generationSummary}</p>}
          </CardContent>
        )}
      </Card>

      {slots.length > 0 && (
        <Card className="border-christmas-gold/20 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-christmas-red via-christmas-gold to-christmas-green" />
          <CardHeader>
            <CardTitle className="text-base text-christmas-snow flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Состав сквадов
              </span>
              <span className="text-sm font-normal text-muted-foreground">
                {filledSlotsCount}/{slots.length} занято
              </span>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Сквадов: {slotsBySquad.length}. Размеры: {formatSquadSizes(currentSquadSizes)}. Свободных слотов: {freeSlotsCount}.
            </p>
          </CardHeader>
        </Card>
      )}

      {slotsBySquad.map(({ squadIndex, items }) => {
        const squadFilled = items.filter(({ slot }) => !!slot.player).length
        const canAddSlot = items.length < 9
        const canRemoveSlot = items.length > 1

        return (
          <Card key={squadIndex} className="border-christmas-gold/20 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base text-christmas-snow flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Сквад {squadIndex + 1}
                </span>
                <span className="text-sm font-normal text-muted-foreground">
                  {squadFilled}/{items.length} занято
                </span>
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-christmas-gold/30 text-christmas-snow"
                  onClick={() => addSlotToSquad(squadIndex)}
                  disabled={!canAddSlot}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Добавить слот
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-christmas-gold/30 text-christmas-snow"
                  onClick={() => removeOneSlotFromSquad(squadIndex)}
                  disabled={!canRemoveSlot}
                >
                  <Minus className="w-3 h-3 mr-1" />
                  Убрать слот
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-2">
              {items.map(({ slot, index }, localIndex) => {
                const slotRoleStats = slot.player
                  ? getPlayerRoleStats(roleStatsIndex, slot.player.player_id, slot.role)
                  : null
                const roleKD = slotRoleStats?.kd ?? slot.player?.totals.kd ?? 0
                const roleSampleSize = slotRoleStats?.games ?? 0
                const selectablePlayersForSlotBase = availablePlayers
                  .filter((player) => !slots.some((candidate) => candidate.player?.player_id === player.player_id))
                  .map((player) => {
                    const roleStats = getPlayerRoleStats(roleStatsIndex, player.player_id, slot.role)
                    const roleGames = roleStats?.games ?? 0
                    const roleKd = Number.isFinite(roleStats?.kd) ? (roleStats?.kd ?? 0) : null
                    const overallKd = Number.isFinite(player.totals.kd) ? player.totals.kd : 0

                    return {
                      player,
                      roleGames,
                      roleKd,
                      overallKd,
                    }
                  })
                const hasRoleHistoryCandidatesForSlot = selectablePlayersForSlotBase.some(
                  (candidate) => candidate.roleGames > 0,
                )
                const selectablePlayersForSlot = selectablePlayersForSlotBase
                  .sort((left, right) => {
                    if (hasRoleHistoryCandidatesForSlot) {
                      const leftHasRole = left.roleGames > 0 ? 1 : 0
                      const rightHasRole = right.roleGames > 0 ? 1 : 0
                      if (rightHasRole !== leftHasRole) {
                        return rightHasRole - leftHasRole
                      }
                    }

                    const leftRoleKd = left.roleKd ?? -1
                    const rightRoleKd = right.roleKd ?? -1
                    if (rightRoleKd !== leftRoleKd) {
                      return rightRoleKd - leftRoleKd
                    }

                    if (right.overallKd !== left.overallKd) {
                      return right.overallKd - left.overallKd
                    }

                    return right.player.totals.events - left.player.totals.events
                  })

                return (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-all",
                      slot.player
                        ? "bg-secondary/30 border-christmas-gold/20"
                        : "bg-secondary/10 border-dashed border-muted-foreground/30",
                      slot.isLocked && "ring-2 ring-christmas-gold/50",
                    )}
                  >
                    <span className="w-6 text-center font-mono text-sm text-muted-foreground">
                      {localIndex + 1}
                    </span>

                    <Select value={slot.role} onValueChange={(value) => changeRole(index, value)}>
                      <SelectTrigger className="w-[140px] bg-secondary/50 border-christmas-gold/20">
                        <span className="flex items-center gap-2">
                          <RoleIcon role={slot.role} />
                          <span className="text-xs">{slot.role}</span>
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((role) => (
                          <SelectItem key={role} value={role}>
                            <span className="flex items-center gap-2">
                              <RoleIcon role={role} />
                              {role}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {slot.player ? (
                      <div className="flex-1 flex items-center gap-3">
                        <PlayerAvatar steamId={slot.player.steam_id} nickname={slot.player.nickname} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-christmas-snow truncate">{slot.player.nickname}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span className={getStatColor(roleKD, 1.0)}>K/D по роли: {roleKD.toFixed(2)}</span>
                            <span>Роль: {roleSampleSize > 0 ? `${roleSampleSize} записей` : "нет истории"}</span>
                            <span>Общий опыт: {slot.player.totals.events} событий</span>
                            {normalizeRoleKey(slot.role) === normalizeRoleKey("Медик") && (
                              <span className="text-pink-400">
                                <Heart className="w-3 h-3 inline mr-1" />
                                {slotRoleStats?.revives ?? slot.player.totals.revives}
                              </span>
                            )}
                            {isVehicleRole(slot.role) && (
                              <span className="text-blue-400">
                                <Car className="w-3 h-3 inline mr-1" />
                                {slotRoleStats?.vehicle ?? slot.player.totals.vehicle}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Select
                        onValueChange={(value) => {
                          const player = availablePlayers.find((candidate) => candidate.player_id === value)
                          if (player) assignPlayer(index, player)
                        }}
                      >
                        <SelectTrigger className="flex-1 bg-secondary/50 border-christmas-gold/20">
                          <span className="text-muted-foreground text-sm">Выберите игрока...</span>
                        </SelectTrigger>
                        <SelectContent>
                          {selectablePlayersForSlot.map(({ player, roleKd, overallKd, roleGames }) => (
                            <SelectItem key={player.player_id} value={player.player_id}>
                              <span className="flex items-center gap-2">
                                <span>{player.nickname}</span>
                                <span className="text-xs text-muted-foreground">
                                  K/D роли: {roleKd !== null ? roleKd.toFixed(2) : "н/д"} ({overallKd.toFixed(2)} общий)
                                  {roleGames > 0 ? `, ${roleGames} записей` : ""}
                                </span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    <div className="flex gap-1">
                      {slot.player && (
                        <>
                          <Button
                            size="sm"
                            variant={slot.isLocked ? "default" : "ghost"}
                            className={cn("h-8 w-8 p-0", slot.isLocked && "bg-christmas-gold text-black")}
                            onClick={() => toggleLock(index)}
                            title={slot.isLocked ? "Разблокировать" : "Заблокировать"}
                          >
                            <Shield className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => removePlayer(index)}
                            title="Убрать игрока из слота"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeSlot(index)}
                        disabled={items.length <= 1}
                        title="Удалить слот роли"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )
      })}

      {squadStats && squadStats.players > 0 && (
        <Card className="border-christmas-gold/20 bg-gradient-to-br from-christmas-red/10 via-card to-christmas-green/10">
          <CardHeader>
            <CardTitle className="text-base text-christmas-snow">Сводная статистика по всем сквадам</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 rounded-lg bg-secondary/30">
                <p className="text-2xl font-bold text-christmas-gold">{squadStats.avgKD.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Средний K/D</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-secondary/30">
                <p className="text-2xl font-bold text-christmas-green">{squadStats.squadKD.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Суммарный K/D</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-secondary/30">
                <p className="text-2xl font-bold text-christmas-snow">
                  {(squadStats.avgWinRate * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground">Средний винрейт</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-secondary/30 md:col-span-1">
                <p className="text-2xl font-bold text-pink-400">{squadStats.totalRevives}</p>
                <p className="text-xs text-muted-foreground">Всего поднятий</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-secondary/30 md:col-span-1">
                <p className="text-2xl font-bold text-blue-400">{squadStats.totalVehicle}</p>
                <p className="text-xs text-muted-foreground">Техники выбито</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
