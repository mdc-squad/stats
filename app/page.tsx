"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Leaderboard } from "@/components/leaderboard"
import { AvgStatLeaderboard } from "@/components/avg-stat-leaderboard"
import { MapChart } from "@/components/charts/map-chart"
import { ActivityChart } from "@/components/charts/activity-chart"
import { RoleChart } from "@/components/charts/role-chart"
import { DailyActivityChart } from "@/components/charts/daily-activity-chart"
import { WeeklyActivityChart } from "@/components/charts/weekly-activity-chart"
import { WinrateProgressChart } from "@/components/charts/winrate-progress-chart"
import { PlayerProgressChart } from "@/components/charts/player-progress-chart"
import { SLLeaderboard } from "@/components/charts/sl-leaderboard"
import { RoleLeaderboard } from "@/components/charts/role-leaderboard"
import { BestMatches } from "@/components/charts/best-matches"
import { PlayerCard } from "@/components/player-card"
import { PlayerSelector } from "@/components/player-selector"
import { GroupStatsCard } from "@/components/group-stats-card"
import { SquadBuilder } from "@/components/squad-builder"
import { Snowfall } from "@/components/snowfall"
import { ChristmasHeader } from "@/components/christmas-header"
import { OverallStatsPanel } from "@/components/overall-stats-panel"
import {
  type MDCData,
  getTopPlayersByStat,
  getMapStats,
  getEventTypeStats,
  getOverallStats,
  getRoleStats,
  getMonthlyActivity,
  getDailyActivity,
  getWeeklyParticipation,
  getSLStats,
  getTopByRole,
  getPlayerProgress,
  getBestMatches,
  getUniqueTags,
  getUniqueRoles,
  filterDataByTags,
  getTopByWinRate,
  getTopByVehicle,
  getTopByKDA,
  getTopByAvgVehicle,
  getTopByAvgRevives,
  getMaxKDByRole,
  getAverageValues,
  calculateRelativeThresholds,
} from "@/lib/data-utils"
import {
  Trophy,
  Crosshair,
  Target,
  Users,
  Calendar,
  Shield,
  Heart,
  Zap,
  Star,
  Syringe,
  TreePine,
  Car,
  TrendingUp,
  Cross
} from "lucide-react"

export default function YearReviewPage() {
  const [rawData, setRawData] = useState<MDCData | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [selectedPlayerForChart, setSelectedPlayerForChart] = useState<string>("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("https://api.hungryfishteam.org/gas/mdc/all")
      .then((res) => {
        if (!res.ok) throw new Error(`API error: ${res.status}`)
        return res.json()
      })
      .then((json) => {
        console.log("[v0] API response structure:", {
          hasPlayers: !!json.players,
          playersType: typeof json.players,
          isPlayersArray: Array.isArray(json.players),
          hasEvents: !!json.events,
          eventsType: typeof json.events,
          isEventsArray: Array.isArray(json.events),
          keys: Object.keys(json),
        })
        setRawData(json)
        setLoading(false)
      })
      .catch((err) => {
        console.error("Failed to load data:", err)
        setLoading(false)
      })
  }, [])

  const availableTags = useMemo(() => {
    if (!rawData) return []
    const players = Array.isArray(rawData.players) ? rawData.players : []
    return getUniqueTags(players)
  }, [rawData])

  useEffect(() => {
    if (availableTags.length > 0 && selectedTags.length === 0) {
      const excludedTags = ["C4", "NKLV", "【UNP】", "Ветеран", "『FW』"]
      const defaultTags = availableTags.filter((tag) => !excludedTags.includes(tag))
      setSelectedTags(defaultTags)
    }
  }, [availableTags, selectedTags.length])

  const data = useMemo(() => {
    if (!rawData) return null
    return filterDataByTags(rawData, selectedTags)
  }, [rawData, selectedTags])

  const uniqueRoles = useMemo(() => {
    if (!data) return []
    const playerStats = Array.isArray(data.player_event_stats) ? data.player_event_stats : []
    return getUniqueRoles(playerStats)
  }, [data])

  // Core stats
  const overallStats = useMemo(() => (data ? getOverallStats(data) : null), [data])
  const mapStats = useMemo(() => (data ? getMapStats(data.events) : []), [data])
  const eventTypeStats = useMemo(() => (data ? getEventTypeStats(data.events) : []), [data])
  const roleStats = useMemo(() => (data ? getRoleStats(data.player_event_stats) : []), [data])
  const monthlyActivity = useMemo(() => (data ? getMonthlyActivity(data.events) : []), [data])

  // New detailed stats
  const dailyActivity = useMemo(() => (data ? getDailyActivity(data.events) : []), [data])
  const weeklyParticipation = useMemo(
    () => (data ? getWeeklyParticipation(data.events, data.player_event_stats) : []),
    [data],
  )
  const slStats = useMemo(() => (data ? getSLStats(data.player_event_stats, data.events, data.players) : []), [data])
  const bestMatches = useMemo(() => (data ? getBestMatches(data.player_event_stats, data.events, 10) : []), [data])

  const roleLeaderboards = useMemo(() => {
    if (!data) return []
    return uniqueRoles.map((role) => ({
      role,
      players: getTopByRole(data.player_event_stats, data.players, role, 5),
    }))
  }, [data, uniqueRoles])

  const maxRoleKD = useMemo(() => {
    if (!data) return {}
    return getMaxKDByRole(data.player_event_stats)
  }, [data])

  // Basic leaderboards
  const topKills = useMemo(() => (data ? getTopPlayersByStat(data.players, "kills", 10) : []), [data])
  const topKD = useMemo(() => (data ? getTopPlayersByStat(data.players, "kd", 10) : []), [data])
  const topWinRate = useMemo(() => (data ? getTopByWinRate(data.players, 5, 10) : []), [data])
  const topEvents = useMemo(() => (data ? getTopPlayersByStat(data.players, "events", 10) : []), [data])
  const topRevives = useMemo(() => (data ? getTopPlayersByStat(data.players, "revives", 10) : []), [data])
  const topDowns = useMemo(() => (data ? getTopPlayersByStat(data.players, "downs", 10) : []), [data])
  const topVehicle = useMemo(() => (data ? getTopByVehicle(data.players, 5) : []), [data])
  const topKDA = useMemo(() => (data ? getTopByKDA(data.players, 10) : []), [data])

  const topAvgVehicle = useMemo(() => (data ? getTopByAvgVehicle(data.players, 3, 10) : []), [data])
  const topAvgRevives = useMemo(() => (data ? getTopByAvgRevives(data.players, 3, 10) : []), [data])

  // Player progress chart data
  const playerProgressData = useMemo(() => {
    if (!data || !selectedPlayerForChart) return []
    return getPlayerProgress(selectedPlayerForChart, data.player_event_stats, data.events)
  }, [data, selectedPlayerForChart])

  const selectedPlayerData = useMemo(() => {
    if (!data) return []
    const players = Array.isArray(data.players) ? data.players : []
    return players.filter((p) => selectedPlayers.includes(p.player_id))
  }, [data, selectedPlayers])

  const activePlayers = useMemo(() => {
    if (!data) return []
    const players = Array.isArray(data.players) ? data.players : []
    return players.filter((p) => p && p.totals && p.totals.events >= 3)
  }, [data])

  const selectedPlayerInfo = useMemo(() => {
    if (!data || !selectedPlayerForChart) return null
    const players = Array.isArray(data.players) ? data.players : []
    return players.find((p) => p && p.player_id === selectedPlayerForChart)
  }, [data, selectedPlayerForChart])

const avgValues = useMemo(() => {
    if (!data) {
      return {
        kills: 100,
        deaths: 80,
        downs: 60,
        revives: 20,
        vehicle: 5,
        events: 15,
        kd: 1.2,
        kda: 1.8,
        win_rate: 0.5,
      }
    }
    return getAverageValues(data.players)
  }, [data])

  const relativeThresholds = useMemo(() => {
    if (!data) return undefined
    return calculateRelativeThresholds(data.players)
  }, [data])

  const maxValues = useMemo(() => {
    if (!data)
      return {
        kills: 500,
        deaths: 300,
        downs: 300,
        revives: 100,
        vehicle: 20,
        events: 50,
        kd: 3,
        kda: 4,
        win_rate: 1,
      }

    const allPlayers = Array.isArray(data.players) ? data.players : []
    const players = allPlayers.filter((p) => p && p.totals && p.totals.events >= 3)
    return {
      kills: Math.max(...players.map((p) => p.totals.kills), 1),
      deaths: Math.max(...players.map((p) => p.totals.deaths), 1),
      downs: Math.max(...players.map((p) => p.totals.downs), 1),
      revives: Math.max(...players.map((p) => p.totals.revives), 1),
      vehicle: Math.max(...players.map((p) => p.totals.vehicle), 1),
      events: Math.max(...players.map((p) => p.totals.events), 1),
      kd: Math.max(...players.map((p) => p.totals.kd), 1),
      kda: Math.max(...players.map((p) => p.totals.kda), 1),
      win_rate: Math.max(...players.map((p) => p.totals.win_rate), 1),
    }
  }, [data])

  const getRoleIcon = (role: string) => {
    const icons: Record<string, React.ReactNode> = {
      SL: <Shield className="w-4 h-4" />,
      Медик: <Syringe className="w-4 h-4" />,
      ГП: <Zap className="w-4 h-4" />,
      Стрелок: <Crosshair className="w-4 h-4" />,
      Гранатомётчик: <Target className="w-4 h-4" />,
      Пулемётчик: <Crosshair className="w-4 h-4" />,
      Снайпер: <Target className="w-4 h-4" />,
      Сапёр: <Shield className="w-4 h-4" />,
    }
    return icons[role] || <Users className="w-4 h-4" />
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <TreePine className="w-16 h-16 text-christmas-green mx-auto animate-pulse" />
          <p className="text-christmas-gold">Загрузка статистики... С Новым Годом!</p>
        </div>
      </div>
    )
  }

  if (!rawData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-christmas-red">Ошибка загрузки данных с сервера</p>
      </div>
    )
  }

  if (!data || !overallStats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-christmas-red">Ошибка обработки данных</p>
      </div>
    )
  }

  // Filter out empty role leaderboards
  const nonEmptyRoleLeaderboards = roleLeaderboards.filter(({ players }) => players.length > 0)

  return (
    <div className="min-h-screen bg-background relative">
      <div
        className="fixed inset-0 z-0 opacity-20"
        style={{
          backgroundImage: `url('/dark-winter-forest-snow-christmas-night-stars.jpg')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-background/80 via-background/60 to-background/90" />

      <Snowfall />
      <ChristmasHeader playersCount={data.meta.counts.players} eventsCount={data.meta.counts.events} />

      <main className="container mx-auto px-4 py-6 space-y-6 relative z-10">
        <OverallStatsPanel stats={overallStats} />

        {/* Event Types Summary */}
        <section>
          <h2 className="text-lg font-semibold mb-4 text-christmas-snow">Статистика по типам событий</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {eventTypeStats.map((et) => (
              <Card key={et.type} className="border-christmas-gold/20">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl mb-1">{et.type}</p>
                  <p className="text-xl font-bold text-christmas-snow">{et.count}</p>
                  <p className="text-xs text-christmas-gold">
                    {et.wins} побед ({et.count > 0 ? ((et.wins / et.count) * 100).toFixed(0) : 0}%)
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Daily Activity Chart - Full Width */}
        <DailyActivityChart data={dailyActivity} />

        {/* Charts Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ActivityChart data={monthlyActivity} />
          <WeeklyActivityChart data={weeklyParticipation} />
          <WinrateProgressChart data={dailyActivity} />
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <MapChart data={mapStats} />
          <RoleChart data={roleStats} />
          <BestMatches
            matches={bestMatches}
            players={(Array.isArray(data.players) ? data.players : []).map((p) => ({ player_id: p.player_id, steam_id: p.steam_id }))}
          />
        </section>

        {/* Tabs for different views - Removed export tab */}
        <Tabs defaultValue="leaderboards" className="space-y-4">
          <TabsList className="w-full flex flex-wrap justify-start gap-2 bg-transparent border-0 h-auto p-0">
            <TabsTrigger
              value="leaderboards"
              className="flex-1 min-w-[140px] py-3 px-4 text-sm font-medium rounded-lg border-2 border-christmas-red/30 bg-christmas-red/10 text-christmas-snow data-[state=active]:bg-christmas-red data-[state=active]:border-christmas-red data-[state=active]:text-white hover:bg-christmas-red/20 transition-all"
            >
              Лидерборды
            </TabsTrigger>
            <TabsTrigger
              value="roles"
              className="flex-1 min-w-[140px] py-3 px-4 text-sm font-medium rounded-lg border-2 border-christmas-green/30 bg-christmas-green/10 text-christmas-snow data-[state=active]:bg-christmas-green data-[state=active]:border-christmas-green data-[state=active]:text-white hover:bg-christmas-green/20 transition-all"
            >
              По ролям
            </TabsTrigger>
            <TabsTrigger
              value="sl"
              className="flex-1 min-w-[140px] py-3 px-4 text-sm font-medium rounded-lg border-2 border-christmas-gold/30 bg-christmas-gold/10 text-christmas-snow data-[state=active]:bg-christmas-gold data-[state=active]:border-christmas-gold data-[state=active]:text-black hover:bg-christmas-gold/20 transition-all"
            >
              Squad Leaders
            </TabsTrigger>
            <TabsTrigger
              value="progress"
              className="flex-1 min-w-[140px] py-3 px-4 text-sm font-medium rounded-lg border-2 border-blue-500/30 bg-blue-500/10 text-christmas-snow data-[state=active]:bg-blue-500 data-[state=active]:border-blue-500 data-[state=active]:text-white hover:bg-blue-500/20 transition-all"
            >
              Прогресс игрока
            </TabsTrigger>
            <TabsTrigger
              value="individual"
              className="flex-1 min-w-[140px] py-3 px-4 text-sm font-medium rounded-lg border-2 border-purple-500/30 bg-purple-500/10 text-christmas-snow data-[state=active]:bg-purple-500 data-[state=active]:border-purple-500 data-[state=active]:text-white hover:bg-purple-500/20 transition-all"
            >
              Карточки
            </TabsTrigger>
            <TabsTrigger
              value="group"
              className="flex-1 min-w-[140px] py-3 px-4 text-sm font-medium rounded-lg border-2 border-orange-500/30 bg-orange-500/10 text-christmas-snow data-[state=active]:bg-orange-500 data-[state=active]:border-orange-500 data-[state=active]:text-white hover:bg-orange-500/20 transition-all"
            >
              Групповые
            </TabsTrigger>
            <TabsTrigger
              value="squad-builder"
              className="flex-1 min-w-[140px] py-3 px-4 text-sm font-medium rounded-lg border-2 border-emerald-500/30 bg-emerald-500/10 text-christmas-snow data-[state=active]:bg-emerald-500 data-[state=active]:border-emerald-500 data-[state=active]:text-white hover:bg-emerald-500/20 transition-all"
            >
              Сборка сквада
            </TabsTrigger>
          </TabsList>

          {/* Leaderboards Tab */}
          <TabsContent value="leaderboards" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Leaderboard
                title="Топ по убийствам"
                players={topKills}
                stat="kills"
                icon={<Crosshair className="w-4 h-4" />}
                variant="christmas"
              />
              <Leaderboard
                title="Топ по K/D"
                players={topKD}
                stat="kd"
                formatValue={(v) => v.toFixed(2)}
                icon={<Target className="w-4 h-4" />}
                variant="christmas"
              />
              <Leaderboard
                title="Топ по KDA"
                players={topKDA}
                stat="kda"
                formatValue={(v) => v.toFixed(2)}
                icon={<TrendingUp className="w-4 h-4" />}
                variant="christmas"
              />
              <Leaderboard
                title="Топ победителей (5+ событий)"
                players={topWinRate}
                stat="win_rate"
                formatValue={(v) => `${(v * 100).toFixed(0)}%`}
                icon={<Trophy className="w-4 h-4" />}
                variant="christmas"
              />
              <Leaderboard
                title="Топ по активности"
                players={topEvents}
                stat="events"
                formatValue={(v) => `${v} событий`}
                icon={<Calendar className="w-4 h-4" />}
                variant="christmas"
              />
              <Leaderboard
                title="Топ медики"
                players={topRevives}
                stat="revives"
                icon={<Heart className="w-4 h-4" />}
                variant="christmas"
              />
              <Leaderboard
                title="Топ по нокам"
                players={topDowns}
                stat="downs"
                icon={<Zap className="w-4 h-4" />}
                variant="christmas"
              />
              <Leaderboard
                title="Топ по выбитой технике"
                players={topVehicle}
                stat="vehicle"
                icon={<Car className="w-4 h-4" />}
                variant="christmas"
                className="bg-gradient-to-br from-blue-500/10 via-card to-blue-500/5"
              />
              <AvgStatLeaderboard
                title="Топ по средней технике за матч"
                players={topAvgVehicle}
                avgStat="avgVehicle"
                totalStat="vehicle"
                formatValue={(v) => v.toFixed(2)}
                icon={<Car className="w-4 h-4" />}
                variant="christmas"
                className="bg-gradient-to-br from-orange-500/10 via-card to-orange-500/5"
              />
              <AvgStatLeaderboard
                title="Топ по среднему поднятию за матч"
                players={topAvgRevives}
                avgStat="avgRevives"
                totalStat="revives"
                formatValue={(v) => v.toFixed(2)}
                icon={<Syringe className="w-4 h-4" />}
                variant="christmas"
                className="bg-gradient-to-br from-pink-500/10 via-card to-pink-500/5"
              />
            </div>
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles" className="space-y-4">
            <p className="text-sm text-muted-foreground bg-card/50 p-3 rounded-lg border border-christmas-gold/20">
              Показаны игроки с лучшим K/D в каждой роли (минимум 3 игры в роли). K/D и KDA рассчитаны только для игр в
              указанной роли.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {nonEmptyRoleLeaderboards.map(({ role, players }) => (
                <RoleLeaderboard key={role} players={players} role={role} icon={getRoleIcon(role)} />
              ))}
            </div>
            {nonEmptyRoleLeaderboards.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-christmas-snow">Нет данных по ролям для выбранных тегов</p>
              </div>
            )}
          </TabsContent>

          {/* SL Tab */}
          <TabsContent value="sl" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SLLeaderboard slStats={slStats} title="Топ Squad Leaders по играм" />
              <SLLeaderboard
                slStats={[...slStats].sort((a, b) => b.slWinRate - a.slWinRate).slice(0, 10)}
                title="Топ SL по Win Rate"
              />
            </div>
          </TabsContent>

          {/* Player Progress Tab */}
          <TabsContent value="progress" className="space-y-4">
            <Card className="border-christmas-gold/20">
              <CardHeader>
                <CardTitle className="text-base text-christmas-snow">Выберите игрока для просмотра прогресса</CardTitle>
              </CardHeader>
              <CardContent>
                <PlayerSelector
                  players={activePlayers}
                  selected={selectedPlayerForChart ? [selectedPlayerForChart] : []}
                  onSelectionChange={(ids) => setSelectedPlayerForChart(ids[0] || "")}
                  placeholder="Найти игрока..."
                />
              </CardContent>
            </Card>

            {selectedPlayerInfo && playerProgressData.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <PlayerProgressChart data={playerProgressData} nickname={selectedPlayerInfo.nickname} />
                <PlayerCard
                  player={selectedPlayerInfo}
                  rank={1}
                  maxValues={maxValues}
                  avgValues={avgValues}
                  maxRoleKD={maxRoleKD}
                  playerStats={data.player_event_stats}
                />
              </div>
            )}

            {!selectedPlayerForChart && (
              <div className="text-center py-12 text-muted-foreground">
                <Star className="w-12 h-12 mx-auto mb-4 text-christmas-gold opacity-50" />
                <p className="text-christmas-snow">Выберите игрока для просмотра его прогресса</p>
              </div>
            )}
          </TabsContent>

          {/* Individual Stats Tab */}
          <TabsContent value="individual" className="space-y-4">
            <Card className="border-christmas-gold/20">
              <CardHeader>
                <CardTitle className="text-base text-christmas-snow">Выберите игроков для просмотра карточек</CardTitle>
              </CardHeader>
              <CardContent>
                <PlayerSelector
                  players={activePlayers}
                  selected={selectedPlayers}
                  onSelectionChange={setSelectedPlayers}
                  placeholder="Найти игрока..."
                />
              </CardContent>
            </Card>

            {selectedPlayerData.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedPlayerData.map((player, index) => (
                  <PlayerCard
                    key={player.player_id}
                    player={player}
                    rank={index + 1}
                    maxValues={maxValues}
                    avgValues={avgValues}
                    maxRoleKD={maxRoleKD}
                    playerStats={data.player_event_stats}
                  />
                ))}
              </div>
            )}

            {selectedPlayers.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Star className="w-12 h-12 mx-auto mb-4 text-christmas-gold opacity-50" />
                <p className="text-christmas-snow">Выберите игроков для просмотра их карточек</p>
              </div>
            )}
          </TabsContent>

          {/* Group Stats Tab */}
          <TabsContent value="group" className="space-y-4">
            <Card className="border-christmas-gold/20">
              <CardHeader>
                <CardTitle className="text-base text-christmas-snow">
                  Выберите игроков для группового сравнения
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PlayerSelector
                  players={activePlayers}
                  selected={selectedPlayers}
                  onSelectionChange={setSelectedPlayers}
                  placeholder="Найти игрока..."
                />
              </CardContent>
            </Card>

            {selectedPlayerData.length > 0 && <GroupStatsCard players={selectedPlayerData} />}

{selectedPlayers.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 text-christmas-gold opacity-50" />
                <p className="text-christmas-snow">Выберите игроков для группового сравнения</p>
              </div>
            )}
          </TabsContent>

          {/* Squad Builder Tab */}
          <TabsContent value="squad-builder" className="space-y-4">
            <SquadBuilder players={activePlayers} playerStats={data.player_event_stats} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
