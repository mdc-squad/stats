"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Dictionaries {
  factions: string[]
  roles: string[]
  specializations: string[]
  squads: string[]
}

interface EventListItem {
  eventId: number
  legacyIdentifier: string
  eventDate: string
  map: string | null
  opponent: string | null
}

interface Scenario {
  lineupScenarioId: number
  eventId: number | null
  eventLegacyIdentifier: string | null
  scenarioNo: number
  name: string
  faction: string | null
}

interface Assignment {
  lineupAssignmentId: number
  color: string
  slotNo: number
  vehicleSlotCode: string | null
  role: string | null
  specialization: string | null
  playerId: number | null
  playerNickname: string | null
  substitutePlayerId: number | null
  substitutePlayerNickname: string | null
}

interface PlayerSearchResult {
  playerId: number
  nickname: string
  tag: string | null
}

const NONE = "__none__"

function emptySlotDraft() {
  return { color: NONE, slotNo: "", vehicleSlotCode: "", role: NONE, specialization: NONE }
}

export default function AdminLineupsPage() {
  const [dictionaries, setDictionaries] = useState<Dictionaries | null>(null)
  const [events, setEvents] = useState<EventListItem[]>([])
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null)

  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [selectedScenarioId, setSelectedScenarioId] = useState<number | null>(null)
  const [newScenario, setNewScenario] = useState({ scenarioNo: "1", name: "", faction: NONE })

  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [error, setError] = useState<string | null>(null)

  const [slotDraft, setSlotDraft] = useState(emptySlotDraft())
  const [playerQuery, setPlayerQuery] = useState("")
  const [playerMatches, setPlayerMatches] = useState<PlayerSearchResult[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerSearchResult | null>(null)

  useEffect(() => {
    fetch("/api/admin/rest/dictionaries", { cache: "no-store" }).then((r) => r.json()).then(setDictionaries)
    fetch("/api/admin/rest/admin/events?limit=100", { cache: "no-store" }).then((r) => r.json()).then(setEvents)
  }, [])

  const loadScenarios = async (eventId: number) => {
    setError(null)
    const response = await fetch(`/api/admin/rest/admin/lineups/events/${eventId}/scenarios`, { cache: "no-store" })
    if (response.ok) setScenarios(await response.json())
  }

  useEffect(() => {
    if (selectedEventId !== null) void loadScenarios(selectedEventId)
    setSelectedScenarioId(null)
    setAssignments([])
  }, [selectedEventId])

  const loadSlots = async (scenarioId: number) => {
    setError(null)
    const response = await fetch(`/api/admin/rest/admin/lineups/scenarios/${scenarioId}/slots`, { cache: "no-store" })
    if (response.ok) setAssignments(await response.json())
  }

  useEffect(() => {
    if (selectedScenarioId !== null) void loadSlots(selectedScenarioId)
  }, [selectedScenarioId])

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

  const handleCreateScenario = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!selectedEventId) return

    const response = await fetch("/api/admin/rest/admin/lineups/scenarios", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        eventId: selectedEventId,
        scenarioNo: Number(newScenario.scenarioNo) || 1,
        name: newScenario.name,
        faction: newScenario.faction === NONE ? null : newScenario.faction,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => null)
      setError(err?.error ?? "Не удалось создать сценарий.")
      return
    }

    setNewScenario({ scenarioNo: "1", name: "", faction: NONE })
    void loadScenarios(selectedEventId)
  }

  const handleAssignSlot = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!selectedScenarioId || slotDraft.color === NONE || !slotDraft.slotNo) {
      setError("Укажите отряд и номер слота.")
      return
    }

    const response = await fetch(
      `/api/admin/rest/admin/lineups/scenarios/${selectedScenarioId}/slots/${slotDraft.color}/${slotDraft.slotNo}`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          playerId: selectedPlayer?.playerId ?? null,
          substitutePlayerId: null,
          vehicleSlotCode: slotDraft.vehicleSlotCode || null,
          role: slotDraft.role === NONE ? null : slotDraft.role,
          specialization: slotDraft.specialization === NONE ? null : slotDraft.specialization,
        }),
      },
    )

    if (!response.ok) {
      const err = await response.json().catch(() => null)
      setError(err?.error ?? "Не удалось назначить слот.")
      return
    }

    setSlotDraft(emptySlotDraft())
    setPlayerQuery("")
    setSelectedPlayer(null)
    void loadSlots(selectedScenarioId)
  }

  const handleClearSlot = async (a: Assignment) => {
    if (!selectedScenarioId) return
    setError(null)
    const response = await fetch(`/api/admin/rest/admin/lineups/scenarios/${selectedScenarioId}/slots/${a.color}/${a.slotNo}`, {
      method: "DELETE",
    })
    if (!response.ok) {
      setError("Не удалось очистить слот.")
      return
    }
    void loadSlots(selectedScenarioId)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-christmas-snow">Лайнап</h1>

      {error && (
        <div className="rounded-md border border-christmas-red/40 bg-christmas-red/10 px-3 py-2 text-sm text-christmas-red">
          {error}
        </div>
      )}

      <div className="w-72">
        <Label className="mb-1.5 block">Матч</Label>
        <Select value={selectedEventId?.toString() ?? ""} onValueChange={(v) => setSelectedEventId(Number(v))}>
          <SelectTrigger>
            <SelectValue placeholder="Выберите матч" />
          </SelectTrigger>
          <SelectContent>
            {events.map((e) => (
              <SelectItem key={e.eventId} value={e.eventId.toString()}>
                {e.eventDate} · {e.map ?? "?"} · {e.opponent ?? "?"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedEventId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Сценарии</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {scenarios.map((s) => (
                <Button
                  key={s.lineupScenarioId}
                  variant={selectedScenarioId === s.lineupScenarioId ? "default" : "outline"}
                  onClick={() => setSelectedScenarioId(s.lineupScenarioId)}
                >
                  #{s.scenarioNo} {s.name} {s.faction ? `(${s.faction})` : ""}
                </Button>
              ))}
            </div>

            <form className="flex flex-wrap items-end gap-3" onSubmit={handleCreateScenario}>
              <div className="w-20 space-y-1.5">
                <Label>№</Label>
                <Input
                  type="number"
                  value={newScenario.scenarioNo}
                  onChange={(e) => setNewScenario((s) => ({ ...s, scenarioNo: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Название</Label>
                <Input value={newScenario.name} onChange={(e) => setNewScenario((s) => ({ ...s, name: e.target.value }))} required />
              </div>
              <div className="w-40 space-y-1.5">
                <Label>Фракция</Label>
                <Select value={newScenario.faction} onValueChange={(v) => setNewScenario((s) => ({ ...s, faction: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {(dictionaries?.factions ?? []).map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit">Создать сценарий</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {selectedScenarioId && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Назначить слот</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="flex flex-wrap items-end gap-3" onSubmit={handleAssignSlot}>
                <div className="w-32 space-y-1.5">
                  <Label>Отряд</Label>
                  <Select value={slotDraft.color} onValueChange={(v) => setSlotDraft((d) => ({ ...d, color: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>—</SelectItem>
                      {(dictionaries?.squads ?? []).map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-20 space-y-1.5">
                  <Label>Слот</Label>
                  <Input type="number" value={slotDraft.slotNo} onChange={(e) => setSlotDraft((d) => ({ ...d, slotNo: e.target.value }))} required />
                </div>
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
                <div className="w-32 space-y-1.5">
                  <Label>Роль</Label>
                  <Select value={slotDraft.role} onValueChange={(v) => setSlotDraft((d) => ({ ...d, role: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>—</SelectItem>
                      {(dictionaries?.roles ?? []).map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-32 space-y-1.5">
                  <Label>Спец.</Label>
                  <Select value={slotDraft.specialization} onValueChange={(v) => setSlotDraft((d) => ({ ...d, specialization: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>—</SelectItem>
                      {(dictionaries?.specializations ?? []).map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24 space-y-1.5">
                  <Label>Техника</Label>
                  <Input value={slotDraft.vehicleSlotCode} onChange={(e) => setSlotDraft((d) => ({ ...d, vehicleSlotCode: e.target.value }))} />
                </div>
                <Button type="submit">Назначить</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Отряд</TableHead>
                    <TableHead>Слот</TableHead>
                    <TableHead>Игрок</TableHead>
                    <TableHead>Роль</TableHead>
                    <TableHead>Спец.</TableHead>
                    <TableHead>Техника</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((a) => (
                    <TableRow key={a.lineupAssignmentId}>
                      <TableCell>{a.color}</TableCell>
                      <TableCell>{a.slotNo}</TableCell>
                      <TableCell>{a.playerNickname ?? "—"}</TableCell>
                      <TableCell>{a.role ?? "—"}</TableCell>
                      <TableCell>{a.specialization ?? "—"}</TableCell>
                      <TableCell>{a.vehicleSlotCode ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => handleClearSlot(a)}>
                          Убрать
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
