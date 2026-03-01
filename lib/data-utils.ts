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
}

export interface PlayerEventStat {
  event_id: string
  player_id: string
  nickname: string
  tag: string
  squad_no: number
  role: string
  specialization: string
  revives: number
  downs: number
  kills: number
  deaths: number
  vehicle: number
  kd: number
  kda: number
}

export interface Player {
  player_id: string
  nickname: string
  tag: string
  discord: string
  steam_id: string
  note: string | null
  joined_at: string
  last_active_at: string
  tenure: string
  totals: {
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
    return normalizeEventId(parts.slice(0, 3).join(" | "))
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

  const filteredEventKeys = new Set(filteredPlayerEventStats.map((s) => normalizeEventId(s.event_id)))
  const eventsLinkedToSelectedPlayers = events.filter((event) => filteredEventKeys.has(normalizeEventId(event.event_id)))

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

export function getTopPlayersByStat(players: Player[], stat: keyof Player["totals"], limit = 10): Player[] {
  return [...players]
    .filter((p) => p.totals.events >= 3)
    .sort((a, b) => (b.totals[stat] as number) - (a.totals[stat] as number))
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
  const totalRevives = players.reduce((sum, p) => sum + (p?.totals?.revives || 0), 0)
  const totalDowns = players.reduce((sum, p) => sum + (p?.totals?.downs || 0), 0)
  const totalVehicle = players.reduce((sum, p) => sum + (p?.totals?.vehicle || 0), 0)

  const eventsWithResult = events.filter((e) => e && e.is_win !== null)
  const wins = eventsWithResult.filter((e) => e.is_win).length
  const losses = eventsWithResult.filter((e) => !e.is_win).length

  // Calculate average KDA
  const playersWithKDA = players.filter((p) => p && p.totals && p.totals.events >= 1)
  const averageKDA =
    playersWithKDA.length > 0 ? playersWithKDA.reduce((sum, p) => sum + (p?.totals?.kda || 0), 0) / playersWithKDA.length : 0

  return {
    totalKills,
    totalDeaths,
    totalRevives,
    totalDowns,
    totalVehicle,
    totalEvents: events.length,
    wins,
    losses,
    winRate: eventsWithResult.length > 0 ? (wins / eventsWithResult.length) * 100 : 0,
    averageKD: totalDeaths > 0 ? totalKills / totalDeaths : 0,
    averageKDA,
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

export function getSLStats(playerStats: PlayerEventStat[], events: GameEvent[], players: Player[]): SLStats[] {
  const slData: Record<string, { kills: number; deaths: number; games: number; wins: number }> = {}
  const eventLookup = new Map(events.map((event) => [normalizeEventId(event.event_id), event]))

  playerStats.forEach((stat) => {
    if (stat.role !== "SL") return

    if (!slData[stat.player_id]) {
      slData[stat.player_id] = { kills: 0, deaths: 0, games: 0, wins: 0 }
    }

    slData[stat.player_id].kills += stat.kills
    slData[stat.player_id].deaths += stat.deaths
    slData[stat.player_id].games++

    const event = eventLookup.get(normalizeEventId(stat.event_id))
    if (event?.is_win) slData[stat.player_id].wins++
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
) {
  const roleData: Record<string, { kills: number; deaths: number; downs: number; games: number }> = {}
  const rawObservedRoles = playerStats
    .map((stat) => stat.role?.trim() ?? "")
    .filter(Boolean)
  const { lookup, entries } = buildDomainLookup(roleDomain, rawObservedRoles)
  const targetRole = resolveRoleName(role, lookup, entries)

  playerStats.forEach((stat) => {
    const statRole = stat.role?.trim()
    if (!statRole) return

    const canonicalRole = resolveRoleName(statRole, lookup, entries)
    if (!canonicalRole || canonicalRole !== targetRole) return

    if (!roleData[stat.player_id]) {
      roleData[stat.player_id] = { kills: 0, deaths: 0, downs: 0, games: 0 }
    }
    roleData[stat.player_id].kills += stat.kills
    roleData[stat.player_id].deaths += stat.deaths
    roleData[stat.player_id].downs += stat.downs
    roleData[stat.player_id].games++
  })

  const totalRoleGames = Object.values(roleData).reduce((sum, data) => sum + data.games, 0)

  return Object.entries(roleData)
    .filter(([, d]) => d.games >= 3)
    .map(([playerId, d]) => {
      const player = players.find((p) => p.player_id === playerId)
      return {
        player_id: playerId,
        nickname: player?.nickname || "Unknown",
        steam_id: player?.steam_id || "",
        kills: d.kills,
        deaths: d.deaths,
        downs: d.downs,
        games: d.games,
        roleTotalEntries: totalRoleGames,
        roleSharePercent: totalRoleGames > 0 ? (d.games / totalRoleGames) * 100 : 0,
        kd: d.deaths > 0 ? d.kills / d.deaths : d.kills,
        kda: d.deaths > 0 ? (d.downs) / d.deaths : d.downs,
      }
    })
    .sort((a, b) => b.kd - a.kd)
    .slice(0, limit)
}

export function getPlayerProgress(playerId: string, playerStats: PlayerEventStat[], events: GameEvent[]) {
  const eventLookup = new Map(events.map((event) => [normalizeEventId(event.event_id), event]))

  const stats = playerStats
    .filter((s) => s.player_id === playerId)
    .map((s) => {
      const event = eventLookup.get(normalizeEventId(s.event_id))
      return { ...s, date: event?.started_at || extractDateFromEventId(s.event_id) || "" }
    })
    .filter((s) => s.date)
    .sort((a, b) => a.date.localeCompare(b.date))

  let cumKills = 0
  let cumDeaths = 0
  return stats.map((s, i) => {
    cumKills += s.kills
    cumDeaths += s.deaths
    return {
      game: i + 1,
      date: toDateKey(s.date),
      kills: s.kills,
      deaths: s.deaths,
      kd: s.deaths > 0 ? s.kills / s.deaths : s.kills,
      cumKD: cumDeaths > 0 ? cumKills / cumDeaths : cumKills,
      cumKills,
      cumDeaths,
    }
  })
}

export function getBestMatches(playerStats: PlayerEventStat[], events: GameEvent[], limit = 10) {
  const eventLookup = new Map(events.map((event) => [normalizeEventId(event.event_id), event]))

  const matches = playerStats
    .filter((s) => s.deaths > 0 || s.kills > 0)
    .map((s) => {
      const event = eventLookup.get(normalizeEventId(s.event_id))
      const fallbackEventType = extractEventIdPart(s.event_id, 0) || ""
      const fallbackMap = deriveMapFromEventId(s.event_id)
      const fallbackDate = extractDateFromEventId(s.event_id) || ""

      return {
        ...s,
        eventType: event?.event_type || fallbackEventType,
        map: event?.map || fallbackMap,
        date: event?.started_at || fallbackDate,
        isWin: event?.is_win ?? null,
      }
    })
    .sort((a, b) => b.kd - a.kd)
    .slice(0, limit)

  return matches
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
  const eventLookup = new Map(events.map((event) => [normalizeEventId(event.event_id), event]))

  playerStats.forEach((stat) => {
    const event = eventLookup.get(normalizeEventId(stat.event_id))
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

  // Calculate max K/D for each role (minimum 3 games)
  const maxKDByRole: Record<string, number> = {}

  Object.values(playerRoleStats).forEach((roles) => {
    Object.entries(roles).forEach(([role, stats]) => {
      if (stats.games < 3) return
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
