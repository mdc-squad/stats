"use client"

import React from "react"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PlayerAvatar } from "@/components/player-avatar"
import { type Player, type PlayerEventStat } from "@/lib/data-utils"
import { 
  Users, 
  Shuffle, 
  X, 
  Plus, 
  Shield, 
  Crosshair, 
  Heart, 
  Car, 
  Target,
  Syringe,
  Zap,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SquadBuilderProps {
  players: Player[]
  playerStats: PlayerEventStat[]
}

type OptimizationCriteria = "kd" | "kda" | "revives" | "vehicle" | "kills" | "win_rate" | "balanced"

interface SquadSlot {
  player: Player | null
  role: string
  isLocked: boolean
}

const ROLES = ["SL", "Медик", "Стрелок", "ГП", "LAT", "HAT", "Пулемётчик", "Снайпер", "Сапёр", "Гранатомётчик"]

const ROLE_ICONS: Record<string, React.ReactNode> = {
  SL: <Shield className="w-4 h-4" />,
  Медик: <Syringe className="w-4 h-4" />,
  ГП: <Zap className="w-4 h-4" />,
  Стрелок: <Crosshair className="w-4 h-4" />,
  LAT: <Target className="w-4 h-4" />,
  HAT: <Target className="w-4 h-4" />,
  Пулемётчик: <Crosshair className="w-4 h-4" />,
  Снайпер: <Target className="w-4 h-4" />,
  Сапёр: <Shield className="w-4 h-4" />,
  Гранатомётчик: <Target className="w-4 h-4" />,
}

function getPlayerRoleStats(playerId: string, role: string, playerStats: PlayerEventStat[]) {
  const stats = playerStats.filter(s => s.player_id === playerId && s.role === role)
  if (stats.length === 0) return null
  
  const totals = stats.reduce((acc, s) => ({
    kills: acc.kills + s.kills,
    deaths: acc.deaths + s.deaths,
    revives: acc.revives + s.revives,
    downs: acc.downs + s.downs,
    vehicle: acc.vehicle + s.vehicle,
    games: acc.games + 1
  }), { kills: 0, deaths: 0, revives: 0, downs: 0, vehicle: 0, games: 0 })
  
  return {
    ...totals,
    kd: totals.deaths > 0 ? totals.kills / totals.deaths : totals.kills,
    kda: totals.deaths > 0 ? totals.downs / totals.deaths : totals.downs
  }
}

function getPlayerScore(player: Player, criteria: OptimizationCriteria, role: string, playerStats: PlayerEventStat[]): number {
  const roleStats = getPlayerRoleStats(player.player_id, role, playerStats)
  
  switch (criteria) {
    case "kd":
      return roleStats?.kd ?? player.totals.kd
    case "kda":
      return roleStats?.kda ?? player.totals.kda
    case "revives":
      return roleStats?.revives ?? player.totals.revives
    case "vehicle":
      return roleStats?.vehicle ?? player.totals.vehicle
    case "kills":
      return roleStats?.kills ?? player.totals.kills
    case "win_rate":
      return player.totals.win_rate
    case "balanced":
      return (
        (player.totals.kd / 3) * 0.3 +
        (player.totals.win_rate) * 0.3 +
        (player.totals.events / 50) * 0.2 +
        (player.totals.kda / 4) * 0.2
      )
    default:
      return player.totals.kd
  }
}

export function SquadBuilder({ players, playerStats }: SquadBuilderProps) {
  const [squadSize, setSquadSize] = useState(9)
  const [slots, setSlots] = useState<SquadSlot[]>([])
  const [availableNicknames, setAvailableNicknames] = useState<string>("")
  const [optimizationCriteria, setOptimizationCriteria] = useState<OptimizationCriteria>("balanced")
  const [requiredRoles, setRequiredRoles] = useState<string[]>(["SL", "Медик", "Медик"])
  const [showSettings, setShowSettings] = useState(true)

  // Parse available players from nicknames
  const availablePlayers = useMemo(() => {
    if (!availableNicknames.trim()) return players
    
    const nicknames = availableNicknames
      .split(/[,\n]/)
      .map(n => n.trim().toLowerCase())
      .filter(n => n.length > 0)
    
    return players.filter(p => 
      nicknames.some(n => p.nickname.toLowerCase().includes(n))
    )
  }, [players, availableNicknames])

  // Initialize slots when squad size changes
  const initializeSlots = () => {
    const newSlots: SquadSlot[] = []
    
    // Add required roles first
    for (let i = 0; i < Math.min(requiredRoles.length, squadSize); i++) {
      newSlots.push({
        player: null,
        role: requiredRoles[i],
        isLocked: false
      })
    }
    
    // Fill remaining with "Стрелок"
    for (let i = newSlots.length; i < squadSize; i++) {
      newSlots.push({
        player: null,
        role: "Стрелок",
        isLocked: false
      })
    }
    
    setSlots(newSlots)
  }

  // Auto-fill squad
  const autoFillSquad = () => {
    const newSlots = [...slots]
    const usedPlayerIds = new Set(
      newSlots.filter(s => s.isLocked && s.player).map(s => s.player!.player_id)
    )
    
    // Get available players not already locked
    let remainingPlayers = availablePlayers.filter(p => !usedPlayerIds.has(p.player_id))
    
    // Fill each unlocked slot
    for (let i = 0; i < newSlots.length; i++) {
      if (newSlots[i].isLocked && newSlots[i].player) continue
      if (remainingPlayers.length === 0) break
      
      const role = newSlots[i].role
      
      // Sort players by score for this role
      const sortedPlayers = [...remainingPlayers].sort((a, b) => 
        getPlayerScore(b, optimizationCriteria, role, playerStats) - 
        getPlayerScore(a, optimizationCriteria, role, playerStats)
      )
      
      // For medic role, prioritize players with revives
      if (role === "Медик") {
        sortedPlayers.sort((a, b) => {
          const aRevives = getPlayerRoleStats(a.player_id, "Медик", playerStats)?.revives ?? a.totals.revives
          const bRevives = getPlayerRoleStats(b.player_id, "Медик", playerStats)?.revives ?? b.totals.revives
          return bRevives - aRevives
        })
      }
      
      // For vehicle roles, prioritize vehicle kills
      if (role === "LAT" || role === "HAT") {
        sortedPlayers.sort((a, b) => b.totals.vehicle - a.totals.vehicle)
      }
      
      const bestPlayer = sortedPlayers[0]
      if (bestPlayer) {
        newSlots[i].player = bestPlayer
        remainingPlayers = remainingPlayers.filter(p => p.player_id !== bestPlayer.player_id)
      }
    }
    
    setSlots(newSlots)
  }

  // Clear all non-locked slots
  const clearUnlockedSlots = () => {
    setSlots(slots.map(s => s.isLocked ? s : { ...s, player: null }))
  }

  // Toggle lock on slot
  const toggleLock = (index: number) => {
    const newSlots = [...slots]
    newSlots[index].isLocked = !newSlots[index].isLocked
    setSlots(newSlots)
  }

  // Change role for slot
  const changeRole = (index: number, role: string) => {
    const newSlots = [...slots]
    newSlots[index].role = role
    setSlots(newSlots)
  }

  // Manually assign player to slot
  const assignPlayer = (index: number, player: Player | null) => {
    const newSlots = [...slots]
    newSlots[index].player = player
    setSlots(newSlots)
  }

  // Remove player from slot
  const removePlayer = (index: number) => {
    const newSlots = [...slots]
    newSlots[index].player = null
    newSlots[index].isLocked = false
    setSlots(newSlots)
  }

  // Add required role
  const addRequiredRole = (role: string) => {
    setRequiredRoles([...requiredRoles, role])
  }

  // Remove required role
  const removeRequiredRole = (index: number) => {
    setRequiredRoles(requiredRoles.filter((_, i) => i !== index))
  }

  // Calculate squad stats
  const squadStats = useMemo(() => {
    const filledSlots = slots.filter(s => s.player)
    if (filledSlots.length === 0) return null
    
    const totalKills = filledSlots.reduce((sum, s) => sum + (s.player?.totals.kills || 0), 0)
    const totalDeaths = filledSlots.reduce((sum, s) => sum + (s.player?.totals.deaths || 0), 0)
    const totalRevives = filledSlots.reduce((sum, s) => sum + (s.player?.totals.revives || 0), 0)
    const totalVehicle = filledSlots.reduce((sum, s) => sum + (s.player?.totals.vehicle || 0), 0)
    const avgKD = filledSlots.reduce((sum, s) => sum + (s.player?.totals.kd || 0), 0) / filledSlots.length
    const avgWinRate = filledSlots.reduce((sum, s) => sum + (s.player?.totals.win_rate || 0), 0) / filledSlots.length
    
    return {
      players: filledSlots.length,
      totalKills,
      totalDeaths,
      totalRevives,
      totalVehicle,
      avgKD,
      avgWinRate,
      squadKD: totalDeaths > 0 ? totalKills / totalDeaths : totalKills
    }
  }, [slots])

  // Get color based on stat comparison
  const getStatColor = (value: number, avg: number, max: number) => {
    const normalized = (value - avg) / (max - avg)
    if (normalized >= 0.8) return "text-green-400"
    if (normalized >= 0.5) return "text-yellow-400"
    if (normalized >= 0.2) return "text-orange-400"
    return "text-red-400"
  }

  return (
    <div className="space-y-4">
      {/* Settings Panel */}
      <Card className="border-christmas-gold/20">
        <CardHeader 
          className="cursor-pointer flex flex-row items-center justify-between"
          onClick={() => setShowSettings(!showSettings)}
        >
          <CardTitle className="text-base text-christmas-snow flex items-center gap-2">
            <Users className="w-4 h-4" />
            Настройки сквада
          </CardTitle>
          {showSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </CardHeader>
        
        {showSettings && (
          <CardContent className="space-y-4">
            {/* Available Players Input */}
            <div className="space-y-2">
              <Label className="text-christmas-snow">Доступные игроки (ники через запятую или по строкам)</Label>
              <textarea
                className="w-full h-24 p-2 rounded-md bg-secondary/50 border border-christmas-gold/20 text-christmas-snow text-sm resize-none"
                placeholder="Введите ники игроков, которые смогут прийти на игру..."
                value={availableNicknames}
                onChange={(e) => setAvailableNicknames(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Найдено игроков: {availablePlayers.length} из {players.length}
              </p>
            </div>

            {/* Squad Size */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-christmas-snow">Размер сквада</Label>
                <Select value={String(squadSize)} onValueChange={(v) => setSquadSize(Number(v))}>
                  <SelectTrigger className="bg-secondary/50 border-christmas-gold/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[4, 5, 6, 7, 8, 9].map(n => (
                      <SelectItem key={n} value={String(n)}>{n} человек</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-christmas-snow">Оптимизация</Label>
                <Select value={optimizationCriteria} onValueChange={(v) => setOptimizationCriteria(v as OptimizationCriteria)}>
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

            {/* Required Roles */}
            <div className="space-y-2">
              <Label className="text-christmas-snow">Обязательные роли</Label>
              <div className="flex flex-wrap gap-2">
                {requiredRoles.map((role, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary" 
                    className="flex items-center gap-1 cursor-pointer hover:bg-destructive/20"
                    onClick={() => removeRequiredRole(index)}
                  >
                    {ROLE_ICONS[role]}
                    {role}
                    <X className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
                <Select onValueChange={addRequiredRole}>
                  <SelectTrigger className="w-[120px] h-6 bg-secondary/50 border-christmas-gold/20">
                    <Plus className="w-3 h-3 mr-1" />
                    <span className="text-xs">Добавить</span>
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(role => (
                      <SelectItem key={role} value={role}>
                        <span className="flex items-center gap-2">
                          {ROLE_ICONS[role]}
                          {role}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button 
                onClick={initializeSlots}
                variant="outline"
                className="border-christmas-gold/30 text-christmas-snow bg-transparent"
              >
                <Users className="w-4 h-4 mr-2" />
                Создать слоты
              </Button>
              <Button 
                onClick={autoFillSquad}
                className="bg-christmas-green hover:bg-christmas-green/80"
              >
                <Shuffle className="w-4 h-4 mr-2" />
                Автозаполнение
              </Button>
              <Button 
                onClick={clearUnlockedSlots}
                variant="destructive"
              >
                <X className="w-4 h-4 mr-2" />
                Очистить
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Squad Slots */}
      {slots.length > 0 && (
        <Card className="border-christmas-gold/20 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-christmas-red via-christmas-gold to-christmas-green" />
          
          <CardHeader>
            <CardTitle className="text-base text-christmas-snow flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Состав сквада
              </span>
              {squadStats && (
                <span className="text-sm font-normal text-muted-foreground">
                  {squadStats.players}/{squadSize} игроков
                </span>
              )}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-2">
            {slots.map((slot, index) => (
              <div 
                key={index}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-all",
                  slot.player 
                    ? "bg-secondary/30 border-christmas-gold/20" 
                    : "bg-secondary/10 border-dashed border-muted-foreground/30",
                  slot.isLocked && "ring-2 ring-christmas-gold/50"
                )}
              >
                {/* Slot Number */}
                <span className="w-6 text-center font-mono text-sm text-muted-foreground">
                  {index + 1}
                </span>

                {/* Role Selector */}
                <Select value={slot.role} onValueChange={(v) => changeRole(index, v)}>
                  <SelectTrigger className="w-[130px] bg-secondary/50 border-christmas-gold/20">
                    <span className="flex items-center gap-2">
                      {ROLE_ICONS[slot.role]}
                      <span className="text-xs">{slot.role}</span>
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(role => (
                      <SelectItem key={role} value={role}>
                        <span className="flex items-center gap-2">
                          {ROLE_ICONS[role]}
                          {role}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Player Info or Selector */}
                {slot.player ? (
                  <div className="flex-1 flex items-center gap-3">
                    <PlayerAvatar 
                      steamId={slot.player.steam_id} 
                      nickname={slot.player.nickname}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-christmas-snow truncate">
                        {slot.player.nickname}
                      </p>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span className={getStatColor(slot.player.totals.kd, 1.0, 2.5)}>
                          K/D: {slot.player.totals.kd.toFixed(2)}
                        </span>
                        <span>
                          {slot.player.totals.events} игр
                        </span>
                        {slot.role === "Медик" && (
                          <span className="text-pink-400">
                            <Heart className="w-3 h-3 inline mr-1" />
                            {slot.player.totals.revives}
                          </span>
                        )}
                        {(slot.role === "LAT" || slot.role === "HAT") && (
                          <span className="text-blue-400">
                            <Car className="w-3 h-3 inline mr-1" />
                            {slot.player.totals.vehicle}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <Select onValueChange={(v) => {
                    const player = availablePlayers.find(p => p.player_id === v)
                    if (player) assignPlayer(index, player)
                  }}>
                    <SelectTrigger className="flex-1 bg-secondary/50 border-christmas-gold/20">
                      <span className="text-muted-foreground text-sm">Выберите игрока...</span>
                    </SelectTrigger>
                    <SelectContent>
                      {availablePlayers
                        .filter(p => !slots.some(s => s.player?.player_id === p.player_id))
                        .map(player => (
                          <SelectItem key={player.player_id} value={player.player_id}>
                            <span className="flex items-center gap-2">
                              <span>{player.nickname}</span>
                              <span className="text-xs text-muted-foreground">
                                K/D: {player.totals.kd.toFixed(2)}
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Lock/Remove Buttons */}
                <div className="flex gap-1">
                  {slot.player && (
                    <>
                      <Button
                        size="sm"
                        variant={slot.isLocked ? "default" : "ghost"}
                        className={cn(
                          "h-8 w-8 p-0",
                          slot.isLocked && "bg-christmas-gold text-black"
                        )}
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
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Squad Stats Card */}
      {squadStats && squadStats.players > 0 && (
        <Card className="border-christmas-gold/20 bg-gradient-to-br from-christmas-red/10 via-card to-christmas-green/10">
          <CardHeader>
            <CardTitle className="text-base text-christmas-snow">Статистика сквада</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 rounded-lg bg-secondary/30">
                <p className="text-2xl font-bold text-christmas-gold">{squadStats.avgKD.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Средний K/D</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-secondary/30">
                <p className="text-2xl font-bold text-christmas-snow">{(squadStats.avgWinRate * 100).toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">Средний винрейт</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-secondary/30">
                <p className="text-2xl font-bold text-pink-400">{squadStats.totalRevives}</p>
                <p className="text-xs text-muted-foreground">Всего поднятий</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-secondary/30">
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
