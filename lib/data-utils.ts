import { getFactionMatchup, getSquadLabel, getSquadLabels, type SquadIdentifier } from "@/lib/squad-utils"

export interface MDCData {
  meta: {
    generated_at: string
    counts: {
      events: number
      player_event_stats: number
      players: number
      clans: number
    }
  }
  events: GameEvent[]
  player_event_stats: PlayerEventStat[]
  players: Player[]
  clans: Clan[]
  dictionaries: MDCDictionaries
}

export interface GameEvent {
  event_id: string
  started_at: string
  event_type: string
  map: string | null
  mode: string | null
  faction_1: string | null
  faction_2: string | null
  team_size: number | null
  enemy_size: number | null
  tickets_1: number | null
  tickets_2: number | null
  score: number | null
  result: string | null
  is_win: boolean | null
  mdc_players: number
  ally_players: number | null
  opponent: string | null
  cast_url: string | null
  tactics_url: string | null
}

export interface PlayerEventStat {
  event_id: string
  player_id: string
  nickname: string
  tag: string
  squad_no: SquadIdentifier
  role: string
  specialization: string
  revives: number
  heals: number
  downs: number
  kills: number
  deaths: number
  vehicle: number
  kd: number
  kda: number
  elo: number
  battleRating: number
  basePoints: number
}

export interface Player {
  player_id: string
  nickname: string
  tag: string
  is_mdc_member: boolean
  discord: string
  steam_id: string
  note: string | null
  joined_at: string
  last_active_at: string
  tenure: string
  totals: {
    heals: number
    revives: number
    downs: number
    kills: number
    deaths: number
    vehicle: number
    events: number
    wins: number
    losses: number
    win_rate: number
    kd: number
    kda: number
    elo: number
    tbf: number
    rating: number
  }
  favorites: {
    role_1: string | null
    role_2: string | null
    specialization: string
    faction: string | null
    map: string
  }
  valid_ratio: number
  raw_counts_by_type: {
    "🏆ТУРНИР": number
    "⚔️SKIRMISH": number
    "🏹CLANMIX": number
    "🎈ИВЕНТ": number
    "🎯ТРЕНИРОВКА": number
    "📚ЛЕКЦИЯ": number
  }
}

export interface Clan {
  clan_id: string
  name: string
  short_name: string
}

export interface MDCDictionaries {
  maps: string[]
  modes: string[]
  factions: string[]
  event_types: string[]
  tags: string[]
  roles: string[]
  specializations: string[]
  vehicles: string[]
  squads: string[]
}

export interface SLStats {
  player_id: string
  nickname: string
  steam_id: string
  slGames: number
  slKills: number
  slDeaths: number
  slKD: number
  slWins: number
  slWinRate: number
}

export interface RoleDataCoverage {
  totalEvents: number
  coveredEvents: number
  coveredEventRate: number
  totalRoleRecords: number
  averageRoleRecordsPerCoveredEvent: number
  extraCoveredEvents: number
}

export interface DataDateRange {
  from?: Date | null
  to?: Date | null
}

export interface EventSliceFilters {
  eventTypes?: string[]
  maps?: string[]
  opponents?: string[]
  factions?: string[]
  modes?: string[]
  matchups?: string[]
  sizes?: string[]
  results?: Array<"win" | "loss" | "unknown">
}

export type RoleLeaderboardMetric =
  | "kd"
  | "kda"
  | "kills"
  | "deaths"
  | "downs"
  | "revives"
  | "heals"
  | "vehicle"
  | "avgRevives"
  | "elo"
  | "tbf"
  | "rating"
  | "avgVehicle"

export type MatchRecordMetric = "kd" | "kda" | "elo" | "kills" | "downs" | "deaths" | "revives" | "heals" | "vehicle"

const DAY_MS = 24 * 60 * 60 * 1000
const TBF_WINDOW_DAYS = 30

function toDateKey(value: string | null | undefined): string {
  if (!value) {
    return "1970-01-01"
  }
  if (value.includes("T")) {
    return value.split("T")[0]
  }
  if (value.includes(" ")) {
    return value.split(" ")[0]
  }
  return value
}

function parseSafeDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function getEventMatchupLabel(event: Pick<GameEvent, "faction_1" | "faction_2">): string {
  return getFactionMatchup(event.faction_1, event.faction_2)?.trim() ?? ""
}

export function getEventSizeLabel(event: Pick<GameEvent, "team_size" | "enemy_size">): string {
  const teamSize =
    typeof event.team_size === "number" && Number.isFinite(event.team_size) && event.team_size > 0
      ? String(event.team_size)
      : "?"
  const enemySize =
    typeof event.enemy_size === "number" && Number.isFinite(event.enemy_size) && event.enemy_size > 0
      ? String(event.enemy_size)
      : "?"

  if (teamSize === "?" && enemySize === "?") {
    return ""
  }

  return `${teamSize}x${enemySize}`
}

function toFiniteNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0
  }

  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

function normalizeEventId(value: string | null | undefined): string {
  if (!value) {
    return ""
  }

  return value
    .trim()
    .replace(/\s*\|\s*/g, " | ")
    .replace(/\s+/g, " ")
    .toLowerCase()
}

function getEventLinkKey(value: string | null | undefined): string {
  if (!value) {
    return ""
  }

  const parts = value
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length >= 4) {
    return normalizeEventId(parts.slice(1, 4).join(" | "))
  }

  if (parts.length >= 3) {
    return normalizeEventId(parts.slice(1, 3).join(" | "))
  }

  return normalizeEventId(value)
}

function getEventCoverageKey(value: string | null | undefined): string {
  if (!value) {
    return ""
  }

  const parts = value
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)

  // Ignore side order (A vs B / B vs A) for coverage checks.
  if (parts.length >= 3) {
    return normalizeEventId(parts.slice(1, 3).join(" | "))
  }

  return normalizeEventId(value)
}

function extractDateFromEventId(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }

  const match = value.match(/(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2}))?/)
  if (!match) {
    return null
  }

  const [, dd, mm, yyyy, hh = "00", min = "00"] = match
  return `${yyyy}-${mm}-${dd}T${hh}:${min}:00`
}

function getComparableDate(value: string | null | undefined): Date | null {
  return parseSafeDate(value) ?? parseSafeDate(extractDateFromEventId(value))
}

function getTbfReferenceDate(
  events: Array<Pick<GameEvent, "started_at" | "event_id">>,
  playerStats: Array<Pick<PlayerEventStat, "event_id">>,
): Date | null {
  let latestTimestamp = 0

  events.forEach((event) => {
    const timestamp = getComparableDate(event.started_at || event.event_id)?.getTime() ?? 0
    if (timestamp > latestTimestamp) {
      latestTimestamp = timestamp
    }
  })

  playerStats.forEach((stat) => {
    const timestamp = getComparableDate(stat.event_id)?.getTime() ?? 0
    if (timestamp > latestTimestamp) {
      latestTimestamp = timestamp
    }
  })

  return latestTimestamp > 0 ? new Date(latestTimestamp) : null
}

function isInsideTbfWindow(date: Date | null, referenceDate: Date | null): boolean {
  if (!date || !referenceDate) {
    return false
  }

  const distance = referenceDate.getTime() - date.getTime()
  return distance >= 0 && distance <= TBF_WINDOW_DAYS * DAY_MS
}

function extractEventIdPart(value: string | null | undefined, index: number): string | null {
  if (!value) {
    return null
  }

  const parts = value
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)

  return parts[index] ?? null
}

function sanitizeOpponentValue(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }

  const normalized = value.trim()
  if (!normalized) {
    return null
  }

  if (/\d{2}\.\d{2}\.\d{4}/.test(normalized)) {
    return null
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) {
    return null
  }

  if (/\b(?:mon|tue|wed|thu|fri|sat|sun)\b/i.test(normalized)) {
    return null
  }

  if (/\bgmt\b/i.test(normalized)) {
    return null
  }

  if (/\bvs\b/i.test(normalized)) {
    return null
  }

  return normalized
}

function deriveMapFromEventId(value: string | null | undefined): string {
  const source = extractEventIdPart(value, 2)
  if (!source) {
    return "Unknown"
  }

  const trimmed = source.trim()
  if (!trimmed) {
    return "Unknown"
  }

  const withoutMode = trimmed.replace(
    /\s+(?:AAS|RAAS|Invasion|Skirmish|Rivals|Destruction|TC|Insurgency|Seed)\b.*$/i,
    "",
  )
  const normalized = withoutMode.trim().replace(/\s{2,}/g, " ")
  return normalized || trimmed
}

function normalizeMapNameKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9а-яё]/gi, "")
}

function stripMapLayerSuffix(value: string): string {
  return value
    .replace(/\s+(?:AAS|RAAS|Invasion|Skirmish|Rivals|Destruction|TC|Insurgency|Seed)\b.*$/i, "")
    .trim()
}

function normalizeTypeForPlayerCounts(value: string | null | undefined): keyof Player["raw_counts_by_type"] | null {
  const normalized = normalizeMapNameKey(value ?? "")

  if (normalized.includes("турнир") || normalized.includes("tournament")) return "🏆ТУРНИР"
  if (normalized.includes("skirmish")) return "⚔️SKIRMISH"
  if (normalized.includes("clanmix")) return "🏹CLANMIX"
  if (normalized.includes("ивент") || normalized.includes("event")) return "🎈ИВЕНТ"
  if (normalized.includes("трениров") || normalized.includes("training")) return "🎯ТРЕНИРОВКА"
  if (normalized.includes("лекц") || normalized.includes("lecture")) return "📚ЛЕКЦИЯ"

  return null
}

function bumpCounter(counter: Map<string, number>, value: string | null | undefined): void {
  const normalized = value?.trim()
  if (!normalized) {
    return
  }

  counter.set(normalized, (counter.get(normalized) ?? 0) + 1)
}

function pickMostFrequentValues(counter: Map<string, number>, limit = 1): string[] {
  return Array.from(counter.entries())
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1]
      }
      return left[0].localeCompare(right[0], "ru")
    })
    .slice(0, limit)
    .map(([value]) => value)
}

function buildDomainLookup(domainValues: string[], observedValues: string[]): {
  lookup: Map<string, string>
  entries: { key: string; value: string }[]
} {
  const lookup = new Map<string, string>()

  domainValues
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((value) => {
      const key = normalizeMapNameKey(value)
      if (key && !lookup.has(key)) {
        lookup.set(key, value)
      }
    })

  observedValues
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((value) => {
      const key = normalizeMapNameKey(value)
      if (key && !lookup.has(key)) {
        lookup.set(key, value)
      }
    })

  return {
    lookup,
    entries: Array.from(lookup.entries()).map(([key, value]) => ({ key, value })),
  }
}

function resolveDomainValue(
  rawValue: string,
  lookup: Map<string, string>,
  entries: { key: string; value: string }[],
  normalizedCandidates: string[],
): string {
  for (const candidate of normalizedCandidates) {
    const exact = lookup.get(candidate)
    if (exact) {
      return exact
    }
  }

  let bestMatch: { value: string; score: number } | null = null
  for (const candidate of normalizedCandidates) {
    for (const entry of entries) {
      if (candidate.startsWith(entry.key) || entry.key.startsWith(candidate)) {
        const score = Math.min(candidate.length, entry.key.length)
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { value: entry.value, score }
        }
      }
    }
  }

  return bestMatch?.value ?? rawValue
}

function resolveRoleName(
  rawRole: string,
  lookup: Map<string, string>,
  entries: { key: string; value: string }[],
): string {
  const trimmed = rawRole.trim()
  if (!trimmed) {
    return ""
  }

  const normalized = normalizeMapNameKey(trimmed)
  if (!normalized) {
    return ""
  }

  return resolveDomainValue(trimmed, lookup, entries, [normalized])
}

export function getUniqueTags(players: Player[] | any, tagDomain: string[] = []): string[] {
  const tags = new Set<string>()
  
  // Defensive check: ensure players is an array
  if (!Array.isArray(players)) {
    console.warn("[v0] getUniqueTags received non-array players:", typeof players)
    return Array.from(
      new Set(
        tagDomain
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    )
  }
  
  players.forEach((p) => {
    if (p && p.tag) tags.add(p.tag)
  })

  const observedTags = Array.from(tags)
  const normalizedObservedTags = new Set(observedTags.map((tag) => normalizeMapNameKey(tag)))
  const domainOrderedTags = tagDomain
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag) => normalizedObservedTags.has(normalizeMapNameKey(tag)))

  const domainKeySet = new Set(domainOrderedTags.map((tag) => normalizeMapNameKey(tag)))
  const extraObservedTags = observedTags
    .filter((tag) => !domainKeySet.has(normalizeMapNameKey(tag)))
    .sort((a, b) => a.localeCompare(b))

  return [...domainOrderedTags, ...extraObservedTags]
}

export function getUniqueRoles(playerStats: PlayerEventStat[] | any, roleDomain: string[] = []): string[] {
  const observedRoles = new Set<string>()
  
  // Defensive check: ensure playerStats is an array
  if (!Array.isArray(playerStats)) {
    console.warn("[v0] getUniqueRoles received non-array playerStats:", typeof playerStats)
    return Array.from(
      new Set(
        roleDomain
          .map((role) => role.trim())
          .filter(Boolean),
      ),
    )
  }

  const rawObservedRoles: string[] = []
  playerStats.forEach((stat) => {
    const role = stat?.role?.trim()
    if (role) {
      rawObservedRoles.push(role)
    }
  })

  const { lookup, entries } = buildDomainLookup(roleDomain, rawObservedRoles)

  rawObservedRoles.forEach((role) => {
    const canonicalRole = resolveRoleName(role, lookup, entries)
    if (canonicalRole) {
      observedRoles.add(canonicalRole)
    }
  })

  const observedRoleList = Array.from(observedRoles)
  const normalizedObservedRoleSet = new Set(observedRoleList.map((role) => normalizeMapNameKey(role)))
  const domainOrderedRoles = roleDomain
    .map((role) => role.trim())
    .filter(Boolean)
    .filter((role) => normalizedObservedRoleSet.has(normalizeMapNameKey(role)))

  const domainKeySet = new Set(domainOrderedRoles.map((role) => normalizeMapNameKey(role)))
  const extraObservedRoles = observedRoleList
    .filter((role) => !domainKeySet.has(normalizeMapNameKey(role)))
    .sort((a, b) => a.localeCompare(b))

  return [...domainOrderedRoles, ...extraObservedRoles]
}

export function filterDataByTags(data: MDCData, selectedTags: string[]): MDCData {
  if (selectedTags.length === 0) return data

  const players = Array.isArray(data.players) ? data.players : []
  const playerEventStats = Array.isArray(data.player_event_stats) ? data.player_event_stats : []
  const events = Array.isArray(data.events) ? data.events : []

  const filteredPlayers = players.filter((p) => p && selectedTags.includes(p.tag))
  const playerIds = new Set(filteredPlayers.map((p) => p.player_id))

  const filteredPlayerEventStats = playerEventStats.filter((stat) => stat && playerIds.has(stat.player_id))

  const filteredEventKeys = new Set(filteredPlayerEventStats.map((s) => getEventLinkKey(s.event_id)))
  const eventsLinkedToSelectedPlayers = events.filter((event) => filteredEventKeys.has(getEventLinkKey(event.event_id)))

  // API can provide events and player_event_stats with non-overlapping windows.
  // In that case keep all events, otherwise event-based charts become empty.
  const filteredEvents = eventsLinkedToSelectedPlayers.length === 0 ? events : eventsLinkedToSelectedPlayers

  return {
    ...data,
    events: filteredEvents,
    player_event_stats: filteredPlayerEventStats,
    players: filteredPlayers,
    meta: {
      ...data.meta,
      counts: {
        ...data.meta.counts,
        events: filteredEvents.length,
        players: filteredPlayers.length,
        player_event_stats: filteredPlayerEventStats.length,
      },
    },
  }
}

export function filterDataToClanPlayers(data: MDCData): MDCData {
  const players = Array.isArray(data.players) ? data.players : []
  const playerEventStats = Array.isArray(data.player_event_stats) ? data.player_event_stats : []

  const filteredPlayers = players.filter((player) => player?.is_mdc_member)
  const playerIds = new Set(filteredPlayers.map((player) => player.player_id))
  const filteredPlayerEventStats = playerEventStats.filter((stat) => stat && playerIds.has(stat.player_id))

  return {
    ...data,
    players: filteredPlayers,
    player_event_stats: filteredPlayerEventStats,
    meta: {
      ...data.meta,
      counts: {
        ...data.meta.counts,
        players: filteredPlayers.length,
        player_event_stats: filteredPlayerEventStats.length,
      },
    },
  }
}

function isLectureEventTypeValue(value: string | null | undefined): boolean {
  const normalized = (value ?? "").trim().toLowerCase()
  return normalized.includes("лекц") || normalized.includes("lecture")
}

export function filterDataToCompetitiveEvents(data: MDCData): MDCData {
  const events = Array.isArray(data.events) ? data.events : []
  const playerStats = Array.isArray(data.player_event_stats) ? data.player_event_stats : []
  const knownEventKeys = new Set(events.map((event) => getEventLinkKey(event.event_id)).filter(Boolean))
  const competitiveEvents = events.filter((event) => !isLectureEventTypeValue(event.event_type))
  const competitiveEventKeys = new Set(competitiveEvents.map((event) => getEventLinkKey(event.event_id)).filter(Boolean))

  const competitivePlayerStats = playerStats.filter((stat) => {
    const eventKey = getEventLinkKey(stat.event_id)
    if (eventKey && competitiveEventKeys.has(eventKey)) {
      return true
    }
    if (eventKey && knownEventKeys.has(eventKey)) {
      return false
    }

    const fallbackEventType = extractEventIdPart(stat.event_id, 0)
    return !isLectureEventTypeValue(fallbackEventType)
  })

  const derivedPlayers = derivePlayersFromStats(data.players, competitivePlayerStats, competitiveEvents)

  return {
    ...data,
    events: competitiveEvents,
    player_event_stats: competitivePlayerStats,
    players: derivedPlayers,
    meta: {
      ...data.meta,
      counts: {
        ...data.meta.counts,
        events: competitiveEvents.length,
        players: derivedPlayers.length,
        player_event_stats: competitivePlayerStats.length,
      },
    },
  }
}

export function filterDataByDateRange(data: MDCData, range: DataDateRange = {}): MDCData {
  const events = Array.isArray(data.events) ? data.events : []
  const playerStats = Array.isArray(data.player_event_stats) ? data.player_event_stats : []
  const hasRange = Boolean(range.from || range.to)
  const eventLookup = new Map(events.map((event) => [getEventLinkKey(event.event_id), event]))

  const isInRange = (date: Date | null): boolean => {
    if (!hasRange) {
      return true
    }
    if (!date) {
      return false
    }
    if (range.from && date < range.from) {
      return false
    }
    if (range.to && date > range.to) {
      return false
    }
    return true
  }

  const filteredEvents = events.filter((event) => isInRange(getComparableDate(event.started_at || event.event_id)))
  const filteredEventKeys = new Set(filteredEvents.map((event) => getEventLinkKey(event.event_id)).filter(Boolean))
  const filteredPlayerStats = playerStats.filter((stat) => {
    const eventKey = getEventLinkKey(stat.event_id)
    if (eventKey && filteredEventKeys.has(eventKey)) {
      return true
    }
    if (eventKey && eventLookup.has(eventKey)) {
      return false
    }
    return isInRange(getComparableDate(stat.event_id))
  })
  const derivedPlayers = derivePlayersFromStats(data.players, filteredPlayerStats, filteredEvents)

  return {
    ...data,
    events: filteredEvents,
    player_event_stats: filteredPlayerStats,
    players: derivedPlayers,
    meta: {
      ...data.meta,
      counts: {
        ...data.meta.counts,
        events: filteredEvents.length,
        players: derivedPlayers.length,
        player_event_stats: filteredPlayerStats.length,
      },
    },
  }
}

export function filterDataByEventSlice(data: MDCData, filters: EventSliceFilters = {}): MDCData {
  const events = Array.isArray(data.events) ? data.events : []
  const playerStats = Array.isArray(data.player_event_stats) ? data.player_event_stats : []
  const hasFilters = Boolean(
    filters.eventTypes?.length ||
      filters.maps?.length ||
      filters.opponents?.length ||
      filters.factions?.length ||
      filters.modes?.length ||
      filters.matchups?.length ||
      filters.sizes?.length ||
      filters.results?.length,
  )

  if (!hasFilters) {
    return data
  }

  const eventLookup = new Map(events.map((event) => [getEventLinkKey(event.event_id), event]))
  const eventTypeSet = new Set((filters.eventTypes ?? []).map((value) => value.trim()).filter(Boolean))
  const mapSet = new Set((filters.maps ?? []).map((value) => value.trim()).filter(Boolean))
  const opponentSet = new Set((filters.opponents ?? []).map((value) => value.trim()).filter(Boolean))
  const factionSet = new Set((filters.factions ?? []).map((value) => value.trim()).filter(Boolean))
  const modeSet = new Set((filters.modes ?? []).map((value) => value.trim()).filter(Boolean))
  const matchupSet = new Set((filters.matchups ?? []).map((value) => value.trim()).filter(Boolean))
  const sizeSet = new Set((filters.sizes ?? []).map((value) => value.trim()).filter(Boolean))
  const resultSet = new Set(filters.results ?? [])

  const filteredEvents = events.filter((event) => {
    const eventType = event.event_type?.trim() ?? ""
    const map = event.map?.trim() ?? ""
    const opponent = event.opponent?.trim() ?? ""
    const faction = event.faction_1?.trim() ?? ""
    const mode = event.mode?.trim() ?? ""
    const matchup = getEventMatchupLabel(event)
    const size = getEventSizeLabel(event)
    const resultKey = event.is_win === true ? "win" : event.is_win === false ? "loss" : "unknown"

    if (eventTypeSet.size > 0 && !eventTypeSet.has(eventType)) {
      return false
    }
    if (mapSet.size > 0 && !mapSet.has(map)) {
      return false
    }
    if (opponentSet.size > 0 && !opponentSet.has(opponent)) {
      return false
    }
    if (factionSet.size > 0 && !factionSet.has(faction)) {
      return false
    }
    if (modeSet.size > 0 && !modeSet.has(mode)) {
      return false
    }
    if (matchupSet.size > 0 && !matchupSet.has(matchup)) {
      return false
    }
    if (sizeSet.size > 0 && !sizeSet.has(size)) {
      return false
    }
    if (resultSet.size > 0 && !resultSet.has(resultKey)) {
      return false
    }

    return true
  })

  const filteredEventKeys = new Set(filteredEvents.map((event) => getEventLinkKey(event.event_id)).filter(Boolean))
  const filteredPlayerStats = playerStats.filter((stat) => {
    const eventKey = getEventLinkKey(stat.event_id)
    if (eventKey && filteredEventKeys.has(eventKey)) {
      return true
    }
    if (eventKey && eventLookup.has(eventKey)) {
      return false
    }
    return false
  })
  const derivedPlayers = derivePlayersFromStats(data.players, filteredPlayerStats, filteredEvents)

  return {
    ...data,
    events: filteredEvents,
    player_event_stats: filteredPlayerStats,
    players: derivedPlayers,
    meta: {
      ...data.meta,
      counts: {
        ...data.meta.counts,
        events: filteredEvents.length,
        players: derivedPlayers.length,
        player_event_stats: filteredPlayerStats.length,
      },
    },
  }
}

function derivePlayersFromStats(basePlayers: Player[], playerStats: PlayerEventStat[], events: GameEvent[]): Player[] {
  const basePlayersById = new Map(basePlayers.map((player) => [player.player_id, player]))
  const eventLookup = new Map(events.map((event) => [getEventLinkKey(event.event_id), event]))
  const tbfReferenceDate = getTbfReferenceDate(events, playerStats)
  const aggregates = new Map<
    string,
    {
      player_id: string
      nickname: string
      tag: string
      latestActivityAt: string
      heals: number
      kills: number
      deaths: number
      downs: number
      revives: number
      vehicle: number
      eloTotal: number
      basePointsTotal: number
      recentEloTotal: number
      wins: number
      losses: number
      eventKeys: Set<string>
      ratedEventKeys: Set<string>
      recentRatedEventKeys: Set<string>
      resolvedEventKeys: Set<string>
      roleCounts: Map<string, number>
      specializationCounts: Map<string, number>
      factionCounts: Map<string, number>
      mapCounts: Map<string, number>
      typeEventKeys: Record<keyof Player["raw_counts_by_type"], Set<string>>
    }
  >()

  playerStats.forEach((stat) => {
    if (!stat?.player_id) {
      return
    }

    if (!aggregates.has(stat.player_id)) {
      aggregates.set(stat.player_id, {
        player_id: stat.player_id,
        nickname: stat.nickname,
        tag: stat.tag,
        latestActivityAt: "",
        heals: 0,
        kills: 0,
        deaths: 0,
        downs: 0,
        revives: 0,
        vehicle: 0,
        eloTotal: 0,
        basePointsTotal: 0,
        recentEloTotal: 0,
        wins: 0,
        losses: 0,
        eventKeys: new Set<string>(),
        ratedEventKeys: new Set<string>(),
        recentRatedEventKeys: new Set<string>(),
        resolvedEventKeys: new Set<string>(),
        roleCounts: new Map<string, number>(),
        specializationCounts: new Map<string, number>(),
        factionCounts: new Map<string, number>(),
        mapCounts: new Map<string, number>(),
        typeEventKeys: {
          "🏆ТУРНИР": new Set<string>(),
          "⚔️SKIRMISH": new Set<string>(),
          "🏹CLANMIX": new Set<string>(),
          "🎈ИВЕНТ": new Set<string>(),
          "🎯ТРЕНИРОВКА": new Set<string>(),
          "📚ЛЕКЦИЯ": new Set<string>(),
        },
      })
    }

    const current = aggregates.get(stat.player_id)
    if (!current) {
      return
    }

    const eventKey = getEventLinkKey(stat.event_id) || normalizeEventId(stat.event_id)
    const event = eventLookup.get(eventKey)
    const activityDate = event?.started_at || extractDateFromEventId(stat.event_id) || ""
    const comparableEventDate = getComparableDate(event?.started_at || stat.event_id)
    const statKey = eventKey || `${stat.player_id}::${stat.event_id}`
    const eloValue = toFiniteNumber(stat.elo)

    current.nickname = current.nickname || stat.nickname
    current.tag = current.tag || stat.tag
    if (activityDate && activityDate > current.latestActivityAt) {
      current.latestActivityAt = activityDate
    }

    current.heals += toFiniteNumber(stat.heals)
    current.kills += toFiniteNumber(stat.kills)
    current.deaths += toFiniteNumber(stat.deaths)
    current.downs += toFiniteNumber(stat.downs)
    current.revives += toFiniteNumber(stat.revives)
    current.vehicle += toFiniteNumber(stat.vehicle)
    current.eloTotal += eloValue
    current.basePointsTotal += toFiniteNumber(stat.basePoints)
    current.eventKeys.add(statKey)

    if (toFiniteNumber(stat.elo) !== 0 || toFiniteNumber(stat.battleRating) !== 0 || toFiniteNumber(stat.basePoints) !== 0) {
      current.ratedEventKeys.add(statKey)
    }

    if (eloValue !== 0 && isInsideTbfWindow(comparableEventDate, tbfReferenceDate)) {
      current.recentEloTotal += eloValue
      current.recentRatedEventKeys.add(statKey)
    }

    const canonicalMap =
      event?.map?.trim() ||
      (() => {
        const fallbackMap = deriveMapFromEventId(stat.event_id)
        return fallbackMap !== "Unknown" ? fallbackMap : ""
      })()
    const canonicalFaction = event?.faction_1?.trim() || ""
    const eventTypeKey = normalizeTypeForPlayerCounts(event?.event_type || extractEventIdPart(stat.event_id, 0))

    bumpCounter(current.roleCounts, stat.role)
    bumpCounter(current.specializationCounts, stat.specialization)
    bumpCounter(current.mapCounts, canonicalMap)
    bumpCounter(current.factionCounts, canonicalFaction)

    if (eventTypeKey) {
      current.typeEventKeys[eventTypeKey].add(eventKey || `${stat.player_id}::${stat.event_id}`)
    }

    if (event && event.is_win !== null && !current.resolvedEventKeys.has(eventKey)) {
      current.resolvedEventKeys.add(eventKey)
      if (event.is_win) {
        current.wins += 1
      } else {
        current.losses += 1
      }
    }
  })

  const aggregatedPlayers = Array.from(aggregates.values()).map((aggregate) => {
      const basePlayer = basePlayersById.get(aggregate.player_id)
      const eventCount = aggregate.eventKeys.size
      const topRoles = pickMostFrequentValues(aggregate.roleCounts, 2)
      const topSpecialization = pickMostFrequentValues(aggregate.specializationCounts, 1)[0] ?? ""
      const topFaction = pickMostFrequentValues(aggregate.factionCounts, 1)[0] ?? null
      const topMap = pickMostFrequentValues(aggregate.mapCounts, 1)[0] ?? basePlayer?.favorites.map ?? "Не указана"
      const kd = aggregate.deaths > 0 ? aggregate.kills / aggregate.deaths : aggregate.kills
      const kda = aggregate.deaths > 0 ? aggregate.downs / aggregate.deaths : aggregate.downs
      const ratedGames = aggregate.ratedEventKeys.size
      const recentRatedGames = aggregate.recentRatedEventKeys.size
      const elo = ratedGames > 0 ? aggregate.eloTotal / ratedGames : 0
      const tbf = recentRatedGames > 0 ? aggregate.recentEloTotal / recentRatedGames : 0
      const rating = aggregate.basePointsTotal + tbf

      return {
        player_id: aggregate.player_id,
        nickname: basePlayer?.nickname || aggregate.nickname || "Unknown",
        tag: basePlayer?.tag || aggregate.tag || "",
        is_mdc_member: basePlayer?.is_mdc_member ?? true,
        discord: basePlayer?.discord ?? "",
        steam_id: basePlayer?.steam_id ?? "",
        note: basePlayer?.note ?? null,
        joined_at: basePlayer?.joined_at ?? "",
        last_active_at: aggregate.latestActivityAt || basePlayer?.last_active_at || "",
        tenure: basePlayer?.tenure ?? "",
        totals: {
          heals: aggregate.heals,
          revives: aggregate.revives,
          downs: aggregate.downs,
          kills: aggregate.kills,
          deaths: aggregate.deaths,
          vehicle: aggregate.vehicle,
          events: eventCount,
          wins: aggregate.wins,
          losses: aggregate.losses,
          win_rate: eventCount > 0 ? aggregate.wins / eventCount : 0,
          kd,
          kda,
          elo,
          tbf,
          rating,
        },
        favorites: {
          role_1: topRoles[0] ?? basePlayer?.favorites.role_1 ?? null,
          role_2: topRoles[1] ?? basePlayer?.favorites.role_2 ?? null,
          specialization: topSpecialization || basePlayer?.favorites.specialization || "",
          faction: topFaction ?? basePlayer?.favorites.faction ?? null,
          map: topMap,
        },
        valid_ratio: basePlayer?.valid_ratio ?? 0,
        raw_counts_by_type: {
          "🏆ТУРНИР": aggregate.typeEventKeys["🏆ТУРНИР"].size,
          "⚔️SKIRMISH": aggregate.typeEventKeys["⚔️SKIRMISH"].size,
          "🏹CLANMIX": aggregate.typeEventKeys["🏹CLANMIX"].size,
          "🎈ИВЕНТ": aggregate.typeEventKeys["🎈ИВЕНТ"].size,
          "🎯ТРЕНИРОВКА": aggregate.typeEventKeys["🎯ТРЕНИРОВКА"].size,
          "📚ЛЕКЦИЯ": aggregate.typeEventKeys["📚ЛЕКЦИЯ"].size,
        },
      }
    })

  const aggregatedById = new Map(aggregatedPlayers.map((player) => [player.player_id, player]))
  const playersWithZeroEvents = basePlayers
    .filter((player) => !aggregatedById.has(player.player_id))
    .map((player) => ({
      ...player,
        totals: {
          ...player.totals,
          heals: 0,
          revives: 0,
          downs: 0,
        kills: 0,
        deaths: 0,
        vehicle: 0,
        events: 0,
        wins: 0,
          losses: 0,
          win_rate: 0,
          kd: 0,
          kda: 0,
          elo: 0,
          tbf: 0,
          rating: 0,
        },
      }))

  return [...aggregatedPlayers, ...playersWithZeroEvents].sort((left, right) => {
      if (right.totals.events !== left.totals.events) {
        return right.totals.events - left.totals.events
      }
      return left.nickname.localeCompare(right.nickname, "ru")
    })
}

export function getTopPlayersByStat(players: Player[], stat: keyof Player["totals"], limit = 10): Player[] {
  return [...players]
    .filter((p) => toFiniteNumber(p.totals.events) >= 3)
    .sort((a, b) => toFiniteNumber(b.totals[stat]) - toFiniteNumber(a.totals[stat]))
    .slice(0, limit)
}

export function getTopByWinRate(players: Player[], minEvents = 5, limit = 10): Player[] {
  return [...players]
    .filter((p) => p.totals.events >= minEvents)
    .sort((a, b) => b.totals.win_rate - a.totals.win_rate)
    .slice(0, limit)
}

export function getTopByVehicle(players: Player[], limit = 5): Player[] {
  return [...players]
    .filter((p) => p.totals.vehicle > 0)
    .sort((a, b) => b.totals.vehicle - a.totals.vehicle)
    .slice(0, limit)
}

export function getTopByKDA(players: Player[], limit = 10): Player[] {
  return [...players]
    .filter((p) => p.totals.events >= 3)
    .sort((a, b) => b.totals.kda - a.totals.kda)
    .slice(0, limit)
}

export function getMapStats(
  events: GameEvent[],
  mapDomain: string[] = [],
): { map: string; count: number; wins: number; resolved: number; winRate: number }[] {
  const mapData: Record<string, { count: number; wins: number; resolved: number }> = {}
  const domainLookup = new Map<string, string>()

  // API dictionary has priority for canonical map names.
  mapDomain
    .map((mapName) => mapName.trim())
    .filter(Boolean)
    .forEach((mapName) => {
      const key = normalizeMapNameKey(mapName)
      if (key && !domainLookup.has(key)) {
        domainLookup.set(key, mapName)
      }
    })

  // Extend dictionary with names actually present in events.
  events.forEach((event) => {
    const eventMap = event.map?.trim()
    if (!eventMap) return
    const key = normalizeMapNameKey(eventMap)
    if (key && !domainLookup.has(key)) {
      domainLookup.set(key, eventMap)
    }
  })

  const domainEntries = Array.from(domainLookup.entries()).map(([key, mapName]) => ({ key, mapName }))

  const resolveMapName = (rawMap: string): string => {
    const trimmed = rawMap.trim()
    if (!trimmed) {
      return ""
    }

    const normalizedTrimmed = stripMapLayerSuffix(trimmed) || trimmed
    if (domainEntries.length === 0) {
      return normalizedTrimmed
    }

    const candidateKeys = Array.from(
      new Set([normalizeMapNameKey(trimmed), normalizeMapNameKey(normalizedTrimmed)].filter(Boolean)),
    )

    for (const candidateKey of candidateKeys) {
      const exact = domainLookup.get(candidateKey)
      if (exact) {
        return exact
      }
    }

    let bestMatch: { mapName: string; score: number } | null = null
    for (const candidateKey of candidateKeys) {
      for (const entry of domainEntries) {
        if (candidateKey.startsWith(entry.key) || entry.key.startsWith(candidateKey)) {
          const score = Math.min(candidateKey.length, entry.key.length)
          if (!bestMatch || score > bestMatch.score) {
            bestMatch = { mapName: entry.mapName, score }
          }
        }
      }
    }

    return bestMatch?.mapName ?? normalizedTrimmed
  }

  events.forEach((event) => {
    const fallbackMap = deriveMapFromEventId(event.event_id)
    const rawMap = event.map?.trim() || (fallbackMap !== "Unknown" ? fallbackMap : "")
    if (!rawMap) return

    const canonicalMap = resolveMapName(rawMap)
    if (!canonicalMap) return

    if (!mapData[canonicalMap]) {
      mapData[canonicalMap] = { count: 0, wins: 0, resolved: 0 }
    }
    mapData[canonicalMap].count++
    if (event.is_win !== null) {
      mapData[canonicalMap].resolved++
      if (event.is_win) mapData[canonicalMap].wins++
    }
  })

  return Object.entries(mapData)
    .map(([map, data]) => ({
      map,
      count: data.count,
      wins: data.wins,
      resolved: data.resolved,
      winRate: data.resolved > 0 ? (data.wins / data.resolved) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)
}

export function getEventTypeStats(
  events: GameEvent[],
  eventTypeDomain: string[] = [],
): { type: string; count: number; wins: number; resolved: number; unknown: number }[] {
  const typeData: Record<string, { count: number; wins: number; resolved: number; unknown: number }> = {}
  const rawObservedTypes = events
    .map((event) => event.event_type?.trim() ?? "")
    .filter(Boolean)
  const { lookup, entries } = buildDomainLookup(eventTypeDomain, rawObservedTypes)

  events.forEach((event) => {
    const eventType = event.event_type?.trim()
    if (!eventType) return

    const canonicalType = resolveDomainValue(
      eventType,
      lookup,
      entries,
      [normalizeMapNameKey(eventType)],
    )

    if (!canonicalType) return

    if (!typeData[canonicalType]) {
      typeData[canonicalType] = { count: 0, wins: 0, resolved: 0, unknown: 0 }
    }
    typeData[canonicalType].count++
    if (event.is_win === null) {
      typeData[canonicalType].unknown++
      return
    }

    typeData[canonicalType].resolved++
    if (event.is_win) typeData[canonicalType].wins++
  })

  return Object.entries(typeData)
    .map(([type, data]) => ({
      type,
      count: data.count,
      wins: data.wins,
      resolved: data.resolved,
      unknown: data.unknown,
    }))
    .sort((a, b) => b.count - a.count)
}

export function getOverallStats(data: MDCData) {
  // Defensive checks: ensure data.players and data.events are arrays
  const players = Array.isArray(data.players) ? data.players : []
  const events = Array.isArray(data.events) ? data.events : []

  const totalKills = players.reduce((sum, p) => sum + (p?.totals?.kills || 0), 0)
  const totalDeaths = players.reduce((sum, p) => sum + (p?.totals?.deaths || 0), 0)
  const totalHeals = players.reduce((sum, p) => sum + (p?.totals?.heals || 0), 0)
  const totalRevives = players.reduce((sum, p) => sum + (p?.totals?.revives || 0), 0)
  const totalDowns = players.reduce((sum, p) => sum + (p?.totals?.downs || 0), 0)
  const totalVehicle = players.reduce((sum, p) => sum + (p?.totals?.vehicle || 0), 0)

  const eventsWithResult = events.filter((e) => e && e.is_win !== null)
  const wins = eventsWithResult.filter((e) => e.is_win).length
  const losses = eventsWithResult.filter((e) => !e.is_win).length

  return {
    totalKills,
    totalDeaths,
    totalHeals,
    totalRevives,
    totalDowns,
    totalVehicle,
    totalEvents: events.length,
    wins,
    losses,
    winRate: eventsWithResult.length > 0 ? (wins / eventsWithResult.length) * 100 : 0,
    averageKD: totalDeaths > 0 ? totalKills / totalDeaths : 0,
    averageKDA: totalDeaths > 0 ? totalDowns / totalDeaths : totalDowns,
    activePlayers: players.filter((p) => p && p.totals && p.totals.events >= 3).length,
  }
}

export interface RelativeThresholds {
  kd: { avg: number; top: number }
  win_rate: { avg: number; top: number }
  revives: { avg: number; top: number }
  downs: { avg: number; top: number }
  events: { avg: number; top: number }
  vehicle: { avg: number; top: number }
  kills: { avg: number; top: number }
}

export function calculateRelativeThresholds(players: Player[]): RelativeThresholds {
  const activePlayers = players.filter((p) => p.totals.events >= 3)
  if (activePlayers.length === 0) {
    return {
      kd: { avg: 1.0, top: 1.5 },
      win_rate: { avg: 0.5, top: 0.6 },
      revives: { avg: 10, top: 15 },
      downs: { avg: 100, top: 150 },
      events: { avg: 20, top: 30 },
      vehicle: { avg: 2, top: 3 },
      kills: { avg: 80, top: 120 },
    }
  }

  const calcStats = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b)
    const avg = values.reduce((s, v) => s + v, 0) / values.length
    const top75 = sorted[Math.floor(sorted.length * 0.75)] || avg
    return { avg, top: top75 }
  }

  return {
    kd: calcStats(activePlayers.map((p) => p.totals.kd)),
    win_rate: calcStats(activePlayers.map((p) => p.totals.win_rate)),
    revives: calcStats(activePlayers.map((p) => p.totals.revives)),
    downs: calcStats(activePlayers.map((p) => p.totals.downs)),
    events: calcStats(activePlayers.map((p) => p.totals.events)),
    vehicle: calcStats(activePlayers.map((p) => p.totals.vehicle)),
    kills: calcStats(activePlayers.map((p) => p.totals.kills)),
  }
}

export function getPlayerStrengths(player: Player, thresholds?: RelativeThresholds): string[] {
  const strengths: string[] = []
  
  // Use relative thresholds if provided, otherwise use legacy static thresholds
  const t = thresholds || {
    kd: { avg: 1.0, top: 1.5 },
    win_rate: { avg: 0.5, top: 0.6 },
    revives: { avg: 10, top: 15 },
    downs: { avg: 100, top: 150 },
    events: { avg: 20, top: 30 },
    vehicle: { avg: 2, top: 3 },
    kills: { avg: 80, top: 120 },
  }
  
  if (player.totals.kd >= t.kd.top && player.totals.events >= 5) strengths.push("Высокий K/D")
  if (player.totals.win_rate >= t.win_rate.top && player.totals.events >= 5) strengths.push("Победитель")
  if (player.totals.revives >= t.revives.top) strengths.push("Медик")
  if (player.totals.downs >= t.downs.top) strengths.push("Убийца")
  if (player.totals.events >= t.events.top) strengths.push("Актив")
  if (player.totals.vehicle >= t.vehicle.top) strengths.push("Убийца техники")
  
  return strengths
}

export function getRoleStats(playerStats: PlayerEventStat[], roleDomain: string[] = []): { role: string; count: number }[] {
  const roleData: Record<string, number> = {}
  const rawObservedRoles = playerStats
    .map((stat) => stat.role?.trim() ?? "")
    .filter(Boolean)
  const { lookup, entries } = buildDomainLookup(roleDomain, rawObservedRoles)

  playerStats.forEach((stat) => {
    const role = stat.role?.trim()
    if (!role) return
    const canonicalRole = resolveRoleName(role, lookup, entries)
    if (!canonicalRole) return
    roleData[canonicalRole] = (roleData[canonicalRole] || 0) + 1
  })

  return Object.entries(roleData)
    .map(([role, count]) => ({ role, count }))
    .sort((a, b) => b.count - a.count)
}

export function getRoleDataCoverage(events: GameEvent[], playerStats: PlayerEventStat[]): RoleDataCoverage {
  const totalEventKeys = new Set(
    events
      .map((event) => getEventCoverageKey(event.event_id))
      .filter(Boolean),
  )
  const totalEvents = totalEventKeys.size

  const coveredEventKeys = new Set(
    playerStats
      .filter((stat) => !!stat?.role?.trim())
      .map((stat) => getEventCoverageKey(stat.event_id))
      .filter(Boolean),
  )

  const coveredEvents =
    totalEventKeys.size > 0
      ? Array.from(coveredEventKeys).filter((eventKey) => totalEventKeys.has(eventKey)).length
      : coveredEventKeys.size
  const extraCoveredEvents = Math.max(0, coveredEventKeys.size - coveredEvents)
  const totalRoleRecords = playerStats.filter((stat) => !!stat?.role?.trim()).length
  const coveredEventRate = totalEvents > 0 ? coveredEvents / totalEvents : 0

  return {
    totalEvents,
    coveredEvents,
    coveredEventRate,
    totalRoleRecords,
    averageRoleRecordsPerCoveredEvent: coveredEvents > 0 ? totalRoleRecords / coveredEvents : 0,
    extraCoveredEvents,
  }
}

export function getMonthlyActivity(events: GameEvent[]): { month: string; count: number; wins: number }[] {
  const monthData: Record<string, { count: number; wins: number }> = {}

  events.forEach((event) => {
    if (event.is_win === null) return

    const date = parseSafeDate(event.started_at)
    if (!date) return
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

    if (!monthData[monthKey]) {
      monthData[monthKey] = { count: 0, wins: 0 }
    }
    monthData[monthKey].count++
    if (event.is_win) monthData[monthKey].wins++
  })

  return Object.entries(monthData)
    .map(([month, data]) => ({
      month,
      count: data.count,
      wins: data.wins,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
}

export function getDailyActivity(
  events: GameEvent[],
): { date: string; count: number; wins: number; cumWinRate: number }[] {
  const dailyData: Record<string, { count: number; wins: number }> = {}

  events.forEach((event) => {
    if (event.is_win === null) return

    const date = toDateKey(event.started_at)
    if (!dailyData[date]) {
      dailyData[date] = { count: 0, wins: 0 }
    }
    dailyData[date].count++
    if (event.is_win) dailyData[date].wins++
  })

  const sorted = Object.entries(dailyData)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date))

  let cumWins = 0
  let cumTotal = 0
  return sorted.map((d) => {
    cumWins += d.wins
    cumTotal += d.count
    return {
      ...d,
      cumWinRate: cumTotal > 0 ? (cumWins / cumTotal) * 100 : 0,
    }
  })
}

export function getWeeklyActivity(
  events: GameEvent[],
): { week: string; count: number; wins: number; winRate: number }[] {
  const weekData: Record<string, { count: number; wins: number }> = {}

  events.forEach((event) => {
    const date = parseSafeDate(event.started_at)
    if (!date) return
    const startOfYear = new Date(date.getFullYear(), 0, 1)
    const weekNum = Math.ceil(((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7)
    const weekKey = `${date.getFullYear()}-W${String(weekNum).padStart(2, "0")}`

    if (!weekData[weekKey]) {
      weekData[weekKey] = { count: 0, wins: 0 }
    }
    weekData[weekKey].count++
    if (event.is_win) weekData[weekKey].wins++
  })

  return Object.entries(weekData)
    .map(([week, data]) => ({
      week,
      count: data.count,
      wins: data.wins,
      winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
    }))
    .sort((a, b) => a.week.localeCompare(b.week))
}

function isSquadLeaderRole(role: string | null | undefined): boolean {
  return (role ?? "").trim().toLowerCase().startsWith("sl")
}

export function getSLStats(playerStats: PlayerEventStat[], events: GameEvent[], players: Player[]): SLStats[] {
  const slData: Record<string, { kills: number; deaths: number; games: number; wins: number }> = {}
  const eventLookup = new Map(events.map((event) => [getEventLinkKey(event.event_id), event]))
  const aggregatedStats = aggregatePlayerEventStats(playerStats)

  aggregatedStats.forEach((stat) => {
    if (!stat.roles.some((role) => isSquadLeaderRole(role))) {
      return
    }

    if (!slData[stat.player_id]) {
      slData[stat.player_id] = { kills: 0, deaths: 0, games: 0, wins: 0 }
    }

    slData[stat.player_id].kills += stat.kills
    slData[stat.player_id].deaths += stat.deaths
    slData[stat.player_id].games += 1

    const event = eventLookup.get(stat.normalized_event_id)
    if (event?.is_win) slData[stat.player_id].wins += 1
  })

  return Object.entries(slData)
    .filter(([, d]) => d.games >= 3)
    .map(([playerId, d]) => {
      const player = players.find((p) => p.player_id === playerId)
      return {
        player_id: playerId,
        nickname: player?.nickname || "Unknown",
        steam_id: player?.steam_id || "",
        slGames: d.games,
        slKills: d.kills,
        slDeaths: d.deaths,
        slKD: d.deaths > 0 ? d.kills / d.deaths : d.kills,
        slWins: d.wins,
        slWinRate: d.games > 0 ? d.wins / d.games : 0,
      }
    })
    .sort((a, b) => b.slGames - a.slGames)
}

export function getTopByRole(
  playerStats: PlayerEventStat[],
  players: Player[],
  role: string,
  limit = 5,
  roleDomain: string[] = [],
  metric: RoleLeaderboardMetric = "kd",
  events: GameEvent[] = [],
) {
  const eventLookup = new Map(events.map((event) => [getEventLinkKey(event.event_id), event]))
  const tbfReferenceDate = getTbfReferenceDate(events, playerStats)
  const roleData: Record<
    string,
    {
      kills: number
      deaths: number
      downs: number
      revives: number
      heals: number
      vehicle: number
      elo: number
      basePoints: number
      recentElo: number
      games: number
      ratedGames: number
      recentRatedGames: number
    }
  > = {}
  const rawObservedRoles = playerStats
    .map((stat) => stat.role?.trim() ?? "")
    .filter(Boolean)
  const { lookup, entries } = buildDomainLookup(roleDomain, rawObservedRoles)
  const targetRole = resolveRoleName(role, lookup, entries)
  const normalizedTargetRole = normalizeMapNameKey(targetRole)

  if (!targetRole || normalizedTargetRole === normalizeMapNameKey("Без кита")) {
    return []
  }

  aggregatePlayerEventStats(playerStats).forEach((stat) => {
    const canonicalRoles = stat.roles
      .map((roleName) => resolveRoleName(roleName, lookup, entries))
      .filter(Boolean)
    if (!canonicalRoles.includes(targetRole)) return

    if (!roleData[stat.player_id]) {
      roleData[stat.player_id] = {
        kills: 0,
        deaths: 0,
        downs: 0,
        revives: 0,
        heals: 0,
        vehicle: 0,
        elo: 0,
        basePoints: 0,
        recentElo: 0,
        games: 0,
        ratedGames: 0,
        recentRatedGames: 0,
      }
    }
    roleData[stat.player_id].kills += stat.kills
    roleData[stat.player_id].deaths += stat.deaths
    roleData[stat.player_id].downs += stat.downs
    roleData[stat.player_id].revives += stat.revives
    roleData[stat.player_id].heals += stat.heals
    roleData[stat.player_id].vehicle += stat.vehicle
    roleData[stat.player_id].elo += stat.elo
    roleData[stat.player_id].basePoints += stat.basePoints
    roleData[stat.player_id].games += 1
    if (stat.elo !== 0 || stat.battleRating !== 0 || stat.basePoints !== 0) {
      roleData[stat.player_id].ratedGames += 1
    }
    const event = eventLookup.get(stat.normalized_event_id)
    const eventDate = getComparableDate(event?.started_at || stat.event_id)
    if (stat.elo !== 0 && isInsideTbfWindow(eventDate, tbfReferenceDate)) {
      roleData[stat.player_id].recentElo += stat.elo
      roleData[stat.player_id].recentRatedGames += 1
    }
  })

  return Object.entries(roleData)
    .filter(([, d]) => d.games >= 10)
    .map(([playerId, d]) => {
      const player = players.find((p) => p.player_id === playerId)
      const kd = d.deaths > 0 ? d.kills / d.deaths : d.kills
      const kda = d.deaths > 0 ? d.downs / d.deaths : d.downs
      const elo = d.ratedGames > 0 ? d.elo / d.ratedGames : 0
      const tbf = d.recentRatedGames > 0 ? d.recentElo / d.recentRatedGames : 0
      const rating = d.basePoints + tbf
      return {
        player_id: playerId,
        nickname: player?.nickname || "Unknown",
        steam_id: player?.steam_id || "",
        kills: d.kills,
        deaths: d.deaths,
        downs: d.downs,
        revives: d.revives,
        heals: d.heals,
        vehicle: d.vehicle,
        games: d.games,
        kd,
        kda,
        elo,
        tbf,
        rating,
        metricValue:
          metric === "kills"
            ? d.kills
            : metric === "deaths"
            ? d.deaths
            : metric === "downs"
            ? d.downs
            : metric === "revives"
            ? d.revives
            : metric === "heals"
            ? d.heals
            : metric === "vehicle"
            ? d.vehicle
            : metric === "avgRevives"
            ? d.revives / d.games
            : metric === "elo"
            ? elo
            : metric === "tbf"
            ? tbf
            : metric === "rating"
            ? rating
            : metric === "avgVehicle"
            ? d.vehicle / d.games
            : metric === "kda"
            ? kda
            : kd,
      }
    })
    .sort((left, right) => {
      if (right.metricValue !== left.metricValue) {
        return right.metricValue - left.metricValue
      }
      if (right.games !== left.games) {
        return right.games - left.games
      }
      if (right.kd !== left.kd) {
        return right.kd - left.kd
      }
      return left.nickname.localeCompare(right.nickname, "ru")
    })
    .slice(0, limit)
}

export interface AggregatedPlayerEventStat extends PlayerEventStat {
  normalized_event_id: string
  roles: string[]
  specializations: string[]
  squads: SquadIdentifier[]
  records: number
}

export interface PastGamePlayerStat extends AggregatedPlayerEventStat {
  steam_id: string
  eloShare: number
  rank: number
  squad_label: string
  squad_labels: string[]
}

export interface PastGameSummary {
  event_id: string
  normalized_event_id: string
  started_at: string
  event_type: string
  map: string
  mode: string | null
  faction_1: string | null
  faction_2: string | null
  faction_matchup: string | null
  opponent: string | null
  result: string | null
  is_win: boolean | null
  tickets_1: number | null
  tickets_2: number | null
  score: number | null
  cast_url: string | null
  tactics_url: string | null
  participants: number
  mdc_players: number
  ally_players: number | null
  enemy_size: number | null
  team_size: number | null
  totalKills: number
  totalDeaths: number
  totalDowns: number
  totalRevives: number
  totalHeals: number
  totalVehicle: number
  players: PastGamePlayerStat[]
  topPerformer: PastGamePlayerStat | null
}

export interface PlayerGameHistoryEntry {
  player_id: string
  event_id: string
  normalized_event_id: string
  started_at: string
  event_type: string
  map: string
  opponent: string | null
  result: string | null
  is_win: boolean | null
  participants: number
  rank: number
  kills: number
  deaths: number
  downs: number
  revives: number
  heals: number
  vehicle: number
  kd: number
  kda: number
  role: string
  roles: string[]
  squad_no: SquadIdentifier
  squad_label: string
  squads: SquadIdentifier[]
  squad_labels: string[]
  elo: number
  eloShare: number
  cumKD: number
  cumKills: number
  cumDeaths: number
}

function compareMatchPlayers(left: PastGamePlayerStat, right: PastGamePlayerStat): number {
  if (right.elo !== left.elo) return right.elo - left.elo
  if (right.kills !== left.kills) return right.kills - left.kills
  if (right.downs !== left.downs) return right.downs - left.downs
  if (right.revives !== left.revives) return right.revives - left.revives
  if (left.deaths !== right.deaths) return left.deaths - right.deaths
  return left.nickname.localeCompare(right.nickname, "ru")
}

function aggregatePlayerEventStats(playerStats: PlayerEventStat[]): AggregatedPlayerEventStat[] {
  const aggregated = new Map<
    string,
    {
      event_id: string
      normalized_event_id: string
      player_id: string
      nickname: string
      tag: string
      squad_no: SquadIdentifier
      roles: Set<string>
      specializations: Set<string>
      squads: Set<SquadIdentifier>
      heals: number
      revives: number
      downs: number
      kills: number
      deaths: number
      vehicle: number
      elo: number
      battleRating: number
      basePoints: number
      records: number
    }
  >()

  playerStats.forEach((stat) => {
    const normalizedEventId = getEventLinkKey(stat.event_id)
    if (!normalizedEventId || !stat.player_id) return

    const key = `${normalizedEventId}::${stat.player_id}`
    if (!aggregated.has(key)) {
      aggregated.set(key, {
        event_id: stat.event_id,
        normalized_event_id: normalizedEventId,
        player_id: stat.player_id,
        nickname: stat.nickname,
        tag: stat.tag,
        squad_no: stat.squad_no,
        roles: new Set<string>(),
        specializations: new Set<string>(),
        squads: new Set<SquadIdentifier>(),
        heals: 0,
        revives: 0,
        downs: 0,
        kills: 0,
        deaths: 0,
        vehicle: 0,
        elo: 0,
        battleRating: 0,
        basePoints: 0,
        records: 0,
      })
    }

    const current = aggregated.get(key)
    if (!current) return

    current.records += 1
    current.heals += toFiniteNumber(stat.heals)
    current.revives += toFiniteNumber(stat.revives)
    current.downs += toFiniteNumber(stat.downs)
    current.kills += toFiniteNumber(stat.kills)
    current.deaths += toFiniteNumber(stat.deaths)
    current.vehicle += toFiniteNumber(stat.vehicle)
    current.elo += toFiniteNumber(stat.elo)
    current.battleRating += toFiniteNumber(stat.battleRating)
    current.basePoints += toFiniteNumber(stat.basePoints)

    const role = stat.role?.trim()
    if (role) current.roles.add(role)

    const specialization = stat.specialization?.trim()
    if (specialization) current.specializations.add(specialization)

    if (
      (typeof stat.squad_no === "number" && Number.isFinite(stat.squad_no) && stat.squad_no > 0) ||
      (typeof stat.squad_no === "string" && stat.squad_no.trim())
    ) {
      current.squads.add(stat.squad_no)
    }
  })

  return Array.from(aggregated.values()).map((entry) => {
    const roles = Array.from(entry.roles.values())
    const specializations = Array.from(entry.specializations.values())
    const squads = Array.from(entry.squads.values()).sort((left, right) => {
      const leftNumber = typeof left === "number" ? left : Number.NaN
      const rightNumber = typeof right === "number" ? right : Number.NaN
      if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
        return leftNumber - rightNumber
      }
      return String(left).localeCompare(String(right), "ru")
    })
    const kd = entry.deaths > 0 ? entry.kills / entry.deaths : entry.kills
    const kda = entry.deaths > 0 ? entry.downs / entry.deaths : entry.downs

    return {
      event_id: entry.event_id,
      normalized_event_id: entry.normalized_event_id,
      player_id: entry.player_id,
      nickname: entry.nickname,
      tag: entry.tag,
      squad_no: squads[0] ?? entry.squad_no,
      role: roles.join(" / "),
      specialization: specializations.join(" / "),
      heals: entry.heals,
      revives: entry.revives,
      downs: entry.downs,
      kills: entry.kills,
      deaths: entry.deaths,
      vehicle: entry.vehicle,
      kd,
      kda,
      elo: entry.elo,
      battleRating: entry.battleRating,
      basePoints: entry.basePoints,
      roles,
      specializations,
      squads,
      records: entry.records,
    }
  })
}

export function getPastGames(
  events: GameEvent[],
  playerStats: PlayerEventStat[],
  players: Player[],
  squadDomain: string[] = [],
): PastGameSummary[] {
  const eventLookup = new Map(events.map((event) => [getEventLinkKey(event.event_id), event]))
  const playerLookup = new Map(players.map((player) => [player.player_id, player]))
  const aggregatedStats = aggregatePlayerEventStats(playerStats)
  const statsByEvent = new Map<string, AggregatedPlayerEventStat[]>()

  aggregatedStats.forEach((stat) => {
    if (!statsByEvent.has(stat.normalized_event_id)) {
      statsByEvent.set(stat.normalized_event_id, [])
    }
    statsByEvent.get(stat.normalized_event_id)?.push(stat)
  })

  const eventKeys = Array.from(
    new Set([...events.map((event) => getEventLinkKey(event.event_id)), ...statsByEvent.keys()]),
  ).filter(Boolean)

  return eventKeys
    .map((eventKey) => {
      const event = eventLookup.get(eventKey)
      const eventStats = statsByEvent.get(eventKey) ?? []
      const fallbackEventId = event?.event_id || eventStats[0]?.event_id || eventKey
      const startedAt = event?.started_at || extractDateFromEventId(fallbackEventId) || ""
      const eventType = event?.event_type || extractEventIdPart(fallbackEventId, 0) || "Событие"
      const map = event?.map || deriveMapFromEventId(fallbackEventId)
      const opponent = sanitizeOpponentValue(event?.opponent)
      const fallbackVersus = extractEventIdPart(fallbackEventId, 3)
      const fallbackFactionParts = (fallbackVersus ?? "")
        .split(/\s+vs\s+/i)
        .map((value) => value.trim())
        .filter(Boolean)
      const faction1 = event?.faction_1 ?? fallbackFactionParts[0] ?? null
      const faction2 = event?.faction_2 ?? fallbackFactionParts[1] ?? null
      const factionMatchup = getFactionMatchup(faction1, faction2)

      const playersWithRank = eventStats
        .map<PastGamePlayerStat>((stat) => {
          const player = playerLookup.get(stat.player_id)
          const squadLabels = getSquadLabels(stat.squads, squadDomain)
          const squadLabel = getSquadLabel(stat.squad_no, squadDomain)
          return {
            ...stat,
            nickname: player?.nickname || stat.nickname || "Unknown",
            tag: player?.tag || stat.tag || "",
            steam_id: player?.steam_id || "",
            eloShare: 0,
            rank: 0,
            squad_label: squadLabel,
            squad_labels: squadLabels.length > 0 ? squadLabels : [squadLabel],
          }
        })
        .sort(compareMatchPlayers)

      const topElo = playersWithRank[0]?.elo ?? 0
      const rankedPlayers = playersWithRank.map((stat, index) => ({
        ...stat,
        rank: index + 1,
        eloShare: topElo > 0 ? (stat.elo / topElo) * 100 : 0,
      }))

      return {
        event_id: fallbackEventId,
        normalized_event_id: eventKey,
        started_at: startedAt,
        event_type: eventType,
        map,
        mode: event?.mode || null,
        faction_1: faction1,
        faction_2: faction2,
        faction_matchup: factionMatchup,
        opponent,
        result: event?.result ?? null,
        is_win: event?.is_win ?? null,
        tickets_1: event?.tickets_1 ?? null,
        tickets_2: event?.tickets_2 ?? null,
        score: event?.score ?? null,
        cast_url: event?.cast_url ?? null,
        tactics_url: event?.tactics_url ?? null,
        participants: rankedPlayers.length,
        mdc_players: rankedPlayers.length,
        ally_players: event?.ally_players ?? null,
        enemy_size: event?.enemy_size ?? null,
        team_size: event?.team_size ?? null,
        totalKills: rankedPlayers.reduce((sum, stat) => sum + stat.kills, 0),
        totalDeaths: rankedPlayers.reduce((sum, stat) => sum + stat.deaths, 0),
        totalDowns: rankedPlayers.reduce((sum, stat) => sum + stat.downs, 0),
        totalRevives: rankedPlayers.reduce((sum, stat) => sum + stat.revives, 0),
        totalHeals: rankedPlayers.reduce((sum, stat) => sum + stat.heals, 0),
        totalVehicle: rankedPlayers.reduce((sum, stat) => sum + stat.vehicle, 0),
        players: rankedPlayers,
        topPerformer: rankedPlayers[0] ?? null,
      }
    })
    .sort((left, right) => {
      const leftTime = parseSafeDate(left.started_at)?.getTime() ?? 0
      const rightTime = parseSafeDate(right.started_at)?.getTime() ?? 0
      if (rightTime !== leftTime) return rightTime - leftTime
      return left.event_id.localeCompare(right.event_id, "ru")
    })
}

export function getPlayerGameHistory(
  playerId: string,
  games: PastGameSummary[],
  limit = 8,
): PlayerGameHistoryEntry[] {
  const chronologicalGames = games
    .map((game) => {
      const playerGame = game.players.find((stat) => stat.player_id === playerId)
      if (!playerGame) return null

      return {
        player_id: playerId,
        event_id: game.event_id,
        normalized_event_id: game.normalized_event_id,
        started_at: game.started_at,
        event_type: game.event_type,
        map: game.map,
        opponent: game.opponent,
        result: game.result,
        is_win: game.is_win,
        participants: game.participants,
        rank: playerGame.rank,
        kills: playerGame.kills,
        deaths: playerGame.deaths,
        downs: playerGame.downs,
        revives: playerGame.revives,
        heals: playerGame.heals,
        vehicle: playerGame.vehicle,
        kd: playerGame.kd,
        kda: playerGame.kda,
        role: playerGame.role,
        roles: playerGame.roles,
        squad_no: playerGame.squad_no,
        squad_label: playerGame.squad_label,
        squads: playerGame.squads,
        squad_labels: playerGame.squad_labels,
        elo: playerGame.elo,
        eloShare: playerGame.eloShare,
      }
    })
    .filter((entry): entry is Omit<PlayerGameHistoryEntry, "cumKD" | "cumKills" | "cumDeaths"> => entry !== null)
    .sort((left, right) => {
      const leftTime = parseSafeDate(left.started_at)?.getTime() ?? 0
      const rightTime = parseSafeDate(right.started_at)?.getTime() ?? 0
      if (leftTime !== rightTime) return leftTime - rightTime
      return left.event_id.localeCompare(right.event_id, "ru")
    })

  let cumKills = 0
  let cumDeaths = 0

  return chronologicalGames
    .map((entry) => {
      cumKills += entry.kills
      cumDeaths += entry.deaths

      return {
        ...entry,
        cumKD: cumDeaths > 0 ? cumKills / cumDeaths : cumKills,
        cumKills,
        cumDeaths,
      }
    })
    .reverse()
    .slice(0, limit)
}

export function getPlayerProgress(playerId: string, playerStats: PlayerEventStat[], events: GameEvent[]) {
  const eventLookup = new Map(events.map((event) => [getEventLinkKey(event.event_id), event]))

  const stats = aggregatePlayerEventStats(playerStats)
    .filter((stat) => stat.player_id === playerId)
    .map((stat) => {
      const event = eventLookup.get(stat.normalized_event_id)
      return { ...stat, date: event?.started_at || extractDateFromEventId(stat.event_id) || "" }
    })
    .filter((stat) => stat.date)
    .sort((left, right) => left.date.localeCompare(right.date))

  let cumKills = 0
  let cumDeaths = 0
  return stats.map((stat, index) => {
    cumKills += stat.kills
    cumDeaths += stat.deaths

    return {
      game: index + 1,
      date: toDateKey(stat.date),
      kills: stat.kills,
      deaths: stat.deaths,
      kd: stat.kd,
      cumKD: cumDeaths > 0 ? cumKills / cumDeaths : cumKills,
      cumKills,
      cumDeaths,
    }
  })
}

export function getTopMatchRecords(
  playerStats: PlayerEventStat[],
  events: GameEvent[],
  metric: MatchRecordMetric,
  limit = 10,
) {
  const eventLookup = new Map(events.map((event) => [getEventLinkKey(event.event_id), event]))
  const sortedRecords = aggregatePlayerEventStats(playerStats)
    .filter((stat) => {
      if (metric === "kd" || metric === "kda") {
        return stat.deaths > 0 || stat.kills > 0
      }
      if (metric === "elo") {
        return stat.elo !== 0
      }
      return stat[metric] > 0
    })
    .map((stat) => {
      const event = eventLookup.get(stat.normalized_event_id)
      const fallbackEventType = extractEventIdPart(stat.event_id, 0) || ""
      const fallbackMap = deriveMapFromEventId(stat.event_id)
      const fallbackDate = extractDateFromEventId(stat.event_id) || ""

      return {
        ...stat,
        eventType: event?.event_type || fallbackEventType,
        map: event?.map || fallbackMap,
        date: event?.started_at || fallbackDate,
        isWin: event?.is_win ?? null,
      }
    })
    .sort((left, right) => {
      const leftValue = metric === "kd" ? left.kd : metric === "kda" ? left.kda : metric === "elo" ? left.elo : left[metric]
      const rightValue =
        metric === "kd" ? right.kd : metric === "kda" ? right.kda : metric === "elo" ? right.elo : right[metric]

      if (rightValue !== leftValue) {
        return rightValue - leftValue
      }
      if (right.kills !== left.kills) {
        return right.kills - left.kills
      }
      if (left.deaths !== right.deaths) {
        return left.deaths - right.deaths
      }
      return left.nickname.localeCompare(right.nickname, "ru")
    })

  const seenPlayers = new Set<string>()

  return sortedRecords
    .filter((record) => {
      if (seenPlayers.has(record.player_id)) {
        return false
      }
      seenPlayers.add(record.player_id)
      return true
    })
    .slice(0, limit)
}

export function getBestMatches(playerStats: PlayerEventStat[], events: GameEvent[], limit = 10) {
  return getTopMatchRecords(playerStats, events, "kd", limit)
}

export const EVENT_TYPE_ICONS: Record<string, { icon: string; name: string }> = {
  "🏆": { icon: "🏆", name: "ТУРНИР" },
  "⚔️": { icon: "⚔️", name: "SKIRMISH" },
  "🏹": { icon: "🏹", name: "CLANMIX" },
  "🎈": { icon: "🎈", name: "Ивент" },
  "🎯": { icon: "🎯", name: "Тренировка" },
  "📚": { icon: "📚", name: "Лекция" },
}

export function getWeeklyParticipation(
  events: GameEvent[],
  playerStats: PlayerEventStat[],
): { week: string; participants: number; uniqueParticipants: number }[] {
  const weekData: Record<string, Set<string>> = {}
  const eventLookup = new Map(events.map((event) => [getEventLinkKey(event.event_id), event]))

  playerStats.forEach((stat) => {
    const event = eventLookup.get(getEventLinkKey(stat.event_id))
    const eventDate = event?.started_at || extractDateFromEventId(stat.event_id)
    if (!eventDate) return

    const date = parseSafeDate(eventDate)
    if (!date) return
    const startOfYear = new Date(date.getFullYear(), 0, 1)
    const weekNum = Math.ceil(((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7)
    const weekKey = `${date.getFullYear()}-W${String(weekNum).padStart(2, "0")}`

    if (!weekData[weekKey]) {
      weekData[weekKey] = new Set()
    }
    weekData[weekKey].add(stat.player_id)
  })

  return Object.entries(weekData)
    .map(([week, players]) => ({
      week,
      participants: players.size,
      uniqueParticipants: players.size,
    }))
    .sort((a, b) => a.week.localeCompare(b.week))
}

export function getTopByAvgVehicle(players: Player[], minEvents = 3, limit = 10): (Player & { avgVehicle: number })[] {
  return [...players]
    .filter((p) => p.totals.events >= minEvents && p.totals.vehicle > 0)
    .map((p) => ({
      ...p,
      avgVehicle: p.totals.vehicle / p.totals.events,
    }))
    .sort((a, b) => b.avgVehicle - a.avgVehicle)
    .slice(0, limit)
}

export function getTopByAvgRevives(players: Player[], minEvents = 3, limit = 10): (Player & { avgRevives: number })[] {
  return [...players]
    .filter((p) => p.totals.events >= minEvents && p.totals.revives > 0)
    .map((p) => ({
      ...p,
      avgRevives: p.totals.revives / p.totals.events,
    }))
    .sort((a, b) => b.avgRevives - a.avgRevives)
    .slice(0, limit)
}

export function getTopByAvgHeals(players: Player[], minEvents = 3, limit = 10): (Player & { avgHeals: number })[] {
  return [...players]
    .filter((p) => p.totals.events >= minEvents && p.totals.heals > 0)
    .map((p) => ({
      ...p,
      avgHeals: p.totals.heals / p.totals.events,
    }))
    .sort((a, b) => b.avgHeals - a.avgHeals)
    .slice(0, limit)
}

export function getMaxKDByRole(playerStats: PlayerEventStat[]): Record<string, number> {
  const roleData: Record<string, { kills: number; deaths: number; games: number }[]> = {}

  // Group stats by player and role
  const playerRoleStats: Record<string, Record<string, { kills: number; deaths: number; games: number }>> = {}

  playerStats.forEach((stat) => {
    if (!stat.role) return

    if (!playerRoleStats[stat.player_id]) {
      playerRoleStats[stat.player_id] = {}
    }
    if (!playerRoleStats[stat.player_id][stat.role]) {
      playerRoleStats[stat.player_id][stat.role] = { kills: 0, deaths: 0, games: 0 }
    }
    playerRoleStats[stat.player_id][stat.role].kills += stat.kills
    playerRoleStats[stat.player_id][stat.role].deaths += stat.deaths
    playerRoleStats[stat.player_id][stat.role].games++
  })

  // Calculate max K/D for each role (minimum 10 games for reliable comparisons)
  const maxKDByRole: Record<string, number> = {}

  Object.values(playerRoleStats).forEach((roles) => {
    Object.entries(roles).forEach(([role, stats]) => {
      if (stats.games < 10) return
      const kd = stats.deaths > 0 ? stats.kills / stats.deaths : stats.kills
      if (!maxKDByRole[role] || kd > maxKDByRole[role]) {
        maxKDByRole[role] = kd
      }
    })
  })

  return maxKDByRole
}

export function getAverageValues(players: Player[]): {
  kills: number
  deaths: number
  downs: number
  revives: number
  vehicle: number
  events: number
  kd: number
  kda: number
  win_rate: number
} {
  const activePlayers = players.filter((p) => p.totals.events >= 3)
  if (activePlayers.length === 0) {
    return { kills: 0, deaths: 0, downs: 0, revives: 0, vehicle: 0, events: 0, kd: 0, kda: 0, win_rate: 0 }
  }

  const sum = activePlayers.reduce(
    (acc, p) => ({
      kills: acc.kills + p.totals.kills,
      deaths: acc.deaths + p.totals.deaths,
      downs: acc.downs + p.totals.downs,
      revives: acc.revives + p.totals.revives,
      vehicle: acc.vehicle + p.totals.vehicle,
      events: acc.events + p.totals.events,
      kd: acc.kd + p.totals.kd,
      kda: acc.kda + p.totals.kda,
      win_rate: acc.win_rate + p.totals.win_rate,
    }),
    { kills: 0, deaths: 0, downs: 0, revives: 0, vehicle: 0, events: 0, kd: 0, kda: 0, win_rate: 0 },
  )

  return {
    kills: sum.kills / activePlayers.length,
    deaths: sum.deaths / activePlayers.length,
    downs: sum.downs / activePlayers.length,
    revives: sum.revives / activePlayers.length,
    vehicle: sum.vehicle / activePlayers.length,
    events: sum.events / activePlayers.length,
    kd: sum.kd / activePlayers.length,
    kda: sum.kda / activePlayers.length,
    win_rate: sum.win_rate / activePlayers.length,
  }
}

export function getMaxValues(players: Player[]): {
  kills: number
  deaths: number
  downs: number
  revives: number
  vehicle: number
  events: number
  kd: number
  kda: number
  win_rate: number
} {
  const activePlayers = players.filter((p) => p.totals.events >= 3)
  if (activePlayers.length === 0) {
    return { kills: 0, deaths: 0, downs: 0, revives: 0, vehicle: 0, events: 0, kd: 0, kda: 0, win_rate: 0 }
  }

  return {
    kills: Math.max(...activePlayers.map((p) => p.totals.kills)),
    deaths: Math.max(...activePlayers.map((p) => p.totals.deaths)),
    downs: Math.max(...activePlayers.map((p) => p.totals.downs)),
    revives: Math.max(...activePlayers.map((p) => p.totals.revives)),
    vehicle: Math.max(...activePlayers.map((p) => p.totals.vehicle)),
    events: Math.max(...activePlayers.map((p) => p.totals.events)),
    kd: Math.max(...activePlayers.map((p) => p.totals.kd)),
    kda: Math.max(...activePlayers.map((p) => p.totals.kda)),
    win_rate: Math.max(...activePlayers.map((p) => p.totals.win_rate)),
  }
}
