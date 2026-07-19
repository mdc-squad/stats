"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface SquadTemplateSummary {
  squadTemplateId: number
  color: string
  slotCount: number
}

interface SquadSlot {
  squadTemplateSlotId: number
  positionNo: number
  playerId: number | null
  playerNickname: string | null
  playerTag: string | null
  notes: string | null
  inactiveValue: string | null
}

interface PlayerSearchResult {
  playerId: number
  nickname: string
  tag: string | null
}

export default function AdminSquadsPage() {
  const [templates, setTemplates] = useState<SquadTemplateSummary[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)
  const [slots, setSlots] = useState<SquadSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [positionNo, setPositionNo] = useState("")
  const [notes, setNotes] = useState("")
  const [playerQuery, setPlayerQuery] = useState("")
  const [playerMatches, setPlayerMatches] = useState<PlayerSearchResult[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerSearchResult | null>(null)

  useEffect(() => {
    fetch("/api/admin/rest/admin/squads/templates", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: SquadTemplateSummary[]) => {
        setTemplates(data)
        if (data.length > 0) setSelectedTemplateId(data[0].squadTemplateId)
      })
  }, [])

  const loadSlots = async (templateId: number) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/rest/admin/squads/templates/${templateId}/slots`, { cache: "no-store" })
      if (!response.ok) {
        setError("Не удалось загрузить состав отряда.")
        return
      }
      setSlots(await response.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedTemplateId !== null) void loadSlots(selectedTemplateId)
  }, [selectedTemplateId])

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

  const handleAssign = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!selectedTemplateId || !positionNo || !selectedPlayer) {
      setError("Укажите позицию и выберите игрока.")
      return
    }

    const response = await fetch(`/api/admin/rest/admin/squads/templates/${selectedTemplateId}/slots/${positionNo}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ playerId: selectedPlayer.playerId, notes: notes || null, inactiveValue: null }),
    })

    if (!response.ok) {
      setError("Не удалось назначить игрока.")
      return
    }

    setPositionNo("")
    setNotes("")
    setPlayerQuery("")
    setSelectedPlayer(null)
    void loadSlots(selectedTemplateId)
  }

  const handleClear = async (slot: SquadSlot) => {
    if (!selectedTemplateId) return
    setError(null)
    const response = await fetch(`/api/admin/rest/admin/squads/templates/${selectedTemplateId}/slots/${slot.positionNo}`, {
      method: "DELETE",
    })
    if (!response.ok) {
      setError("Не удалось очистить позицию.")
      return
    }
    void loadSlots(selectedTemplateId)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-christmas-snow">Отряды</h1>

      {error && (
        <div className="rounded-md border border-christmas-red/40 bg-christmas-red/10 px-3 py-2 text-sm text-christmas-red">
          {error}
        </div>
      )}

      <div className="w-56">
        <Select value={selectedTemplateId?.toString() ?? ""} onValueChange={(v) => setSelectedTemplateId(Number(v))}>
          <SelectTrigger>
            <SelectValue placeholder="Выберите отряд" />
          </SelectTrigger>
          <SelectContent>
            {templates.map((t) => (
              <SelectItem key={t.squadTemplateId} value={t.squadTemplateId.toString()}>
                {t.color} ({t.slotCount} игроков)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Назначить игрока на позицию</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-3" onSubmit={handleAssign}>
            <div className="w-24 space-y-1.5">
              <Label>Позиция</Label>
              <Input type="number" value={positionNo} onChange={(e) => setPositionNo(e.target.value)} required />
            </div>
            <div className="relative space-y-1.5">
              <Label>Игрок</Label>
              <Input
                value={selectedPlayer ? `${selectedPlayer.nickname} ${selectedPlayer.tag ?? ""}` : playerQuery}
                onChange={(e) => {
                  setSelectedPlayer(null)
                  setPlayerQuery(e.target.value)
                }}
                placeholder="Поиск по нику..."
              />
              {playerMatches.length > 0 && !selectedPlayer && (
                <div className="absolute z-10 mt-1 w-64 rounded-md border border-border bg-card shadow-lg">
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
            <div className="space-y-1.5">
              <Label>Заметка</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <Button type="submit">Назначить</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Загрузка...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Позиция</TableHead>
                  <TableHead>Игрок</TableHead>
                  <TableHead>Заметка</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slots.map((slot) => (
                  <TableRow key={slot.squadTemplateSlotId}>
                    <TableCell>{slot.positionNo}</TableCell>
                    <TableCell>{slot.playerNickname ?? "—"}</TableCell>
                    <TableCell>{slot.notes ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => handleClear(slot)}>
                        Убрать
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
