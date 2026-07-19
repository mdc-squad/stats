"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Dictionaries {
  maps: string[]
  modes: string[]
  factions: string[]
  eventTypes: string[]
  roles: string[]
  specializations: string[]
  squads: string[]
}

interface Clan {
  clanId: number
  name: string | null
}

interface ReferenceItem {
  id: number
  name: string
}

interface EventListItem {
  eventId: number
  legacyIdentifier: string
  eventDate: string
  map: string | null
  opponent: string | null
  result: string | null
}

interface RosterEntry {
  participationId?: number
  playerId: number
  playerNickname: string
  attendanceStatus: string
  squadColor: string | null
  role: string | null
  specialization: string | null
  revives: number | null
  heals: number | null
  downs: number | null
  kills: number | null
  deaths: number | null
  vehicle: number | null
  kd?: number | null
  kda?: number | null
  elo?: number | null
  battleRating?: number | null
  basePoints?: number | null
}

interface PlayerSearchResult {
  playerId: number
  nickname: string
  tag: string | null
}

const NONE = "__none__"

function emptyMatchForm() {
  return {
    legacyIdentifier: "",
    eventDate: "",
    eventType: NONE,
    map: NONE,
    mode: NONE,
    homeFaction: NONE,
    opponentFaction: NONE,
    homeTickets: "",
    opponentTickets: "",
    result: NONE,
    opponentStrength: NONE,
    opponent: NONE,
    castUrl: "",
    tacticsUrl: "",
    discordUrl: "",
  }
}

function emptyRosterDraft() {
  return { attendanceStatus: "Да", squadColor: NONE, role: NONE, specialization: NONE, revives: "", heals: "", downs: "", kills: "", deaths: "", vehicle: "" }
}

export default function AdminEventsPage() {
  const [dictionaries, setDictionaries] = useState<Dictionaries | null>(null)
  const [clans, setClans] = useState<Clan[]>([])
  const [strengthCategories, setStrengthCategories] = useState<ReferenceItem[]>([])
  const [events, setEvents] = useState<EventListItem[]>([])
  const [error, setError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyMatchForm())
  const [roster, setRoster] = useState<RosterEntry[]>([])

  const [rosterDraft, setRosterDraft] = useState(emptyRosterDraft())
  const [playerQuery, setPlayerQuery] = useState("")
  const [playerMatches, setPlayerMatches] = useState<PlayerSearchResult[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerSearchResult | null>(null)

  useEffect(() => {
    fetch("/api/admin/rest/dictionaries", { cache: "no-store" }).then((r) => r.json()).then(setDictionaries)
    fetch("/api/admin/rest/clans", { cache: "no-store" }).then((r) => r.json()).then(setClans)
    fetch("/api/admin/rest/admin/dictionaries/strength-categories", { cache: "no-store" }).then((r) => r.json()).then(setStrengthCategories)
    void loadEvents()
  }, [])

  const loadEvents = async () => {
    const response = await fetch("/api/admin/rest/admin/events?limit=100", { cache: "no-store" })
    if (response.ok) setEvents(await response.json())
  }

  useEffect(() => {
    if (!playerQuery) {
      setPlayerMatches([])
      return
    }
    let cancelled = false
    fetch(`/api/admin/rest/admin/players?q=${encodeURIComponent(playerQuery)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data: PlayerSearchResult[]) => {
        if (!cancelled) setPlayerMatches(data.slice(0, 8))
      })
    return () => {
      cancelled = true
    }
  }, [playerQuery])

  const handleOpenEvent = async (eventId: number) => {
    setError(null)
    const response = await fetch(`/api/admin/rest/admin/events/${eventId}`, { cache: "no-store" })
    if (!response.ok) {
      setError("Не удалось загрузить матч.")
      return
    }
    const data = await response.json()
    setEditingId(data.eventId)
    setForm({
      legacyIdentifier: data.legacyIdentifier,
      eventDate: data.eventDate,
      eventType: data.eventType ?? NONE,
      map: data.map ?? NONE,
      mode: data.mode ?? NONE,
      homeFaction: data.homeFaction ?? NONE,
      opponentFaction: data.opponentFaction ?? NONE,
      homeTickets: data.homeTickets?.toString() ?? "",
      opponentTickets: data.opponentTickets?.toString() ?? "",
      result: data.result ?? NONE,
      opponentStrength: data.opponentStrength ?? NONE,
      opponent: data.opponent ?? NONE,
      castUrl: data.castUrl ?? "",
      tacticsUrl: data.tacticsUrl ?? "",
      discordUrl: data.discordUrl ?? "",
    })
    setRoster(data.roster)
  }

  const handleNewEvent = () => {
    setEditingId(null)
    setForm(emptyMatchForm())
    setRoster([])
  }

  const handleAddRosterEntry = () => {
    if (!selectedPlayer) {
      setError("Выберите игрока для добавления в состав.")
      return
    }
    if (roster.some((r) => r.playerId === selectedPlayer.playerId)) {
      setError("Этот игрок уже в составе.")
      return
    }

    setRoster((r) => [
      ...r,
      {
        playerId: selectedPlayer.playerId,
        playerNickname: selectedPlayer.nickname,
        attendanceStatus: rosterDraft.attendanceStatus,
        squadColor: rosterDraft.squadColor === NONE ? null : rosterDraft.squadColor,
        role: rosterDraft.role === NONE ? null : rosterDraft.role,
        specialization: rosterDraft.specialization === NONE ? null : rosterDraft.specialization,
        revives: rosterDraft.revives === "" ? null : Number(rosterDraft.revives),
        heals: rosterDraft.heals === "" ? null : Number(rosterDraft.heals),
        downs: rosterDraft.downs === "" ? null : Number(rosterDraft.downs),
        kills: rosterDraft.kills === "" ? null : Number(rosterDraft.kills),
        deaths: rosterDraft.deaths === "" ? null : Number(rosterDraft.deaths),
        vehicle: rosterDraft.vehicle === "" ? null : Number(rosterDraft.vehicle),
      },
    ])
    setRosterDraft(emptyRosterDraft())
    setPlayerQuery("")
    setSelectedPlayer(null)
    setError(null)
  }

  const handleRemoveRosterEntry = (playerId: number) => {
    setRoster((r) => r.filter((entry) => entry.playerId !== playerId))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    const payload = {
      legacyIdentifier: form.legacyIdentifier,
      eventDate: form.eventDate,
      eventType: form.eventType === NONE ? null : form.eventType,
      map: form.map === NONE ? null : form.map,
      mode: form.mode === NONE ? null : form.mode,
      homeFaction: form.homeFaction === NONE ? null : form.homeFaction,
      opponentFaction: form.opponentFaction === NONE ? null : form.opponentFaction,
      homeTickets: form.homeTickets === "" ? null : Number(form.homeTickets),
      opponentTickets: form.opponentTickets === "" ? null : Number(form.opponentTickets),
      result: form.result === NONE ? null : form.result,
      opponentStrength: form.opponentStrength === NONE ? null : form.opponentStrength,
      opponent: form.opponent === NONE ? null : form.opponent,
      castUrl: form.castUrl || null,
      tacticsUrl: form.tacticsUrl || null,
      discordUrl: form.discordUrl || null,
      roster: roster.map((r) => ({
        playerId: r.playerId,
        attendanceStatus: r.attendanceStatus,
        squadColor: r.squadColor,
        role: r.role,
        specialization: r.specialization,
        revives: r.revives,
        heals: r.heals,
        downs: r.downs,
        kills: r.kills,
        deaths: r.deaths,
        vehicle: r.vehicle,
      })),
    }

    const method = editingId ? "PUT" : "POST"
    const url = editingId ? `/api/admin/rest/admin/events/${editingId}` : "/api/admin/rest/admin/events"

    const response = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) })
    if (!response.ok) {
      const err = await response.json().catch(() => null)
      setError(err?.error ?? "Не удалось сохранить матч.")
      return
    }

    const saved = await response.json()
    setEditingId(saved.eventId)
    setRoster(saved.roster)
    void loadEvents()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-christmas-snow">Матчи</h1>
        <Button variant="outline" onClick={handleNewEvent}>Новый матч</Button>
      </div>

      {error && (
        <div className="rounded-md border border-christmas-red/40 bg-christmas-red/10 px-3 py-2 text-sm text-christmas-red">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{editingId ? `Матч #${editingId}` : "Новый матч"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Идентификатор</Label>
                  <Input value={form.legacyIdentifier} onChange={(e) => setForm((f) => ({ ...f, legacyIdentifier: e.target.value }))} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Дата</Label>
                  <Input type="date" value={form.eventDate} onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Тип события</Label>
                  <Select value={form.eventType} onValueChange={(v) => setForm((f) => ({ ...f, eventType: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>—</SelectItem>
                      {(dictionaries?.eventTypes ?? []).map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Карта</Label>
                  <Select value={form.map} onValueChange={(v) => setForm((f) => ({ ...f, map: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>—</SelectItem>
                      {(dictionaries?.maps ?? []).map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Режим</Label>
                  <Select value={form.mode} onValueChange={(v) => setForm((f) => ({ ...f, mode: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>—</SelectItem>
                      {(dictionaries?.modes ?? []).map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Результат</Label>
                  <Select value={form.result} onValueChange={(v) => setForm((f) => ({ ...f, result: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>—</SelectItem>
                      <SelectItem value="ПОБЕДА">ПОБЕДА</SelectItem>
                      <SelectItem value="ПОРАЖЕНИЕ">ПОРАЖЕНИЕ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Соперник (сила)</Label>
                  <Select value={form.opponentStrength} onValueChange={(v) => setForm((f) => ({ ...f, opponentStrength: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>—</SelectItem>
                      {strengthCategories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Наша фракция</Label>
                  <Select value={form.homeFaction} onValueChange={(v) => setForm((f) => ({ ...f, homeFaction: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>—</SelectItem>
                      {(dictionaries?.factions ?? []).map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Фракция соперника</Label>
                  <Select value={form.opponentFaction} onValueChange={(v) => setForm((f) => ({ ...f, opponentFaction: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>—</SelectItem>
                      {(dictionaries?.factions ?? []).map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Соперник (клан)</Label>
                  <Select value={form.opponent} onValueChange={(v) => setForm((f) => ({ ...f, opponent: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>—</SelectItem>
                      {clans.filter((c) => c.name).map((c) => <SelectItem key={c.clanId} value={c.name!}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Наши тикеты</Label>
                  <Input type="number" value={form.homeTickets} onChange={(e) => setForm((f) => ({ ...f, homeTickets: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Тикеты соперника</Label>
                  <Input type="number" value={form.opponentTickets} onChange={(e) => setForm((f) => ({ ...f, opponentTickets: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Cast URL</Label>
                  <Input value={form.castUrl} onChange={(e) => setForm((f) => ({ ...f, castUrl: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Tactics URL</Label>
                  <Input value={form.tacticsUrl} onChange={(e) => setForm((f) => ({ ...f, tacticsUrl: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Discord URL</Label>
                  <Input value={form.discordUrl} onChange={(e) => setForm((f) => ({ ...f, discordUrl: e.target.value }))} />
                </div>
              </div>

              <Button type="submit">{editingId ? "Сохранить матч" : "Создать матч"}</Button>
            </form>

            <div className="space-y-3 border-t border-border/60 pt-4">
              <h2 className="text-sm font-semibold text-christmas-snow">Состав</h2>

              <div className="flex flex-wrap items-end gap-2">
                <div className="relative space-y-1.5">
                  <Label>Игрок</Label>
                  <Input
                    className="w-56"
                    value={selectedPlayer ? `${selectedPlayer.nickname} ${selectedPlayer.tag ?? ""}` : playerQuery}
                    onChange={(e) => {
                      setSelectedPlayer(null)
                      setPlayerQuery(e.target.value)
                    }}
                    placeholder="Поиск по нику..."
                  />
                  {playerMatches.length > 0 && !selectedPlayer && (
                    <div className="absolute z-10 mt-1 w-56 rounded-md border border-border bg-card shadow-lg">
                      {playerMatches.map((p) => (
                        <button
                          key={p.playerId}
                          type="button"
                          className="block w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
                          onClick={() => {
                            setSelectedPlayer(p)
                            setPlayerMatches([])
                          }}
                        >
                          {p.nickname} {p.tag ?? ""}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="w-28 space-y-1.5">
                  <Label>Статус</Label>
                  <Select value={rosterDraft.attendanceStatus} onValueChange={(v) => setRosterDraft((d) => ({ ...d, attendanceStatus: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Да">Да</SelectItem>
                      <SelectItem value="Нет">Нет</SelectItem>
                      <SelectItem value="Резерв">Резерв</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-28 space-y-1.5">
                  <Label>Отряд</Label>
                  <Select value={rosterDraft.squadColor} onValueChange={(v) => setRosterDraft((d) => ({ ...d, squadColor: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>—</SelectItem>
                      {(dictionaries?.squads ?? []).map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-32 space-y-1.5">
                  <Label>Роль</Label>
                  <Select value={rosterDraft.role} onValueChange={(v) => setRosterDraft((d) => ({ ...d, role: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>—</SelectItem>
                      {(dictionaries?.roles ?? []).map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-32 space-y-1.5">
                  <Label>Спец.</Label>
                  <Select value={rosterDraft.specialization} onValueChange={(v) => setRosterDraft((d) => ({ ...d, specialization: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>—</SelectItem>
                      {(dictionaries?.specializations ?? []).map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {(["kills", "deaths", "downs", "revives", "heals", "vehicle"] as const).map((field) => (
                  <div key={field} className="w-16 space-y-1.5">
                    <Label className="capitalize">{field}</Label>
                    <Input
                      type="number"
                      value={rosterDraft[field]}
                      onChange={(e) => setRosterDraft((d) => ({ ...d, [field]: e.target.value }))}
                    />
                  </div>
                ))}
                <Button type="button" onClick={handleAddRosterEntry}>Добавить</Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Игрок</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Отряд</TableHead>
                    <TableHead>Роль</TableHead>
                    <TableHead>K/D</TableHead>
                    <TableHead>KDA</TableHead>
                    <TableHead>ELO</TableHead>
                    <TableHead>БР</TableHead>
                    <TableHead>БП</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roster.map((r) => (
                    <TableRow key={r.playerId}>
                      <TableCell>{r.playerNickname}</TableCell>
                      <TableCell>{r.attendanceStatus}</TableCell>
                      <TableCell>{r.squadColor ?? "—"}</TableCell>
                      <TableCell>{r.role ?? "—"}</TableCell>
                      <TableCell>{r.kills ?? 0}/{r.deaths ?? 0}</TableCell>
                      <TableCell>{r.kda?.toFixed(2) ?? "—"}</TableCell>
                      <TableCell>{r.elo?.toFixed(0) ?? "—"}</TableCell>
                      <TableCell>{r.battleRating?.toFixed(1) ?? "—"}</TableCell>
                      <TableCell>{r.basePoints ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => handleRemoveRosterEntry(r.playerId)}>
                          Убрать
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Последние матчи</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[600px] space-y-1 overflow-y-auto">
            {events.map((e) => (
              <button
                key={e.eventId}
                type="button"
                onClick={() => void handleOpenEvent(e.eventId)}
                className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                <div className="truncate">{e.eventDate} · {e.map ?? "?"} · {e.opponent ?? "?"}</div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
