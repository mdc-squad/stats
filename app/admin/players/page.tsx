"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Dictionaries {
  roles: string[]
  specializations: string[]
  factions: string[]
  maps: string[]
}

interface PlayerRow {
  playerId: number
  nickname: string
  tag: string | null
  joinedOn: string | null
  lastActiveOn: string | null
  inactiveOn: string | null
  discordHandle: string | null
  steamId: string | null
  notes: string | null
  primaryRole: string | null
  secondaryRole: string | null
  specialization: string | null
  preferredFaction: string | null
  preferredMap: string | null
  serviceLengthText: string | null
}

const NONE = "__none__"

function emptyForm() {
  return {
    nickname: "",
    tag: "",
    joinedOn: "",
    lastActiveOn: "",
    inactiveOn: "",
    discordHandle: "",
    steamId: "",
    notes: "",
    primaryRole: NONE,
    secondaryRole: NONE,
    specialization: NONE,
    preferredFaction: NONE,
    preferredMap: NONE,
    serviceLengthText: "",
  }
}

export default function AdminPlayersPage() {
  const [dictionaries, setDictionaries] = useState<Dictionaries | null>(null)
  const [query, setQuery] = useState("")
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm())

  useEffect(() => {
    fetch("/api/admin/rest/dictionaries", { cache: "no-store" })
      .then((r) => r.json())
      .then(setDictionaries)
  }, [])

  const load = async (q: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/rest/admin/players?q=${encodeURIComponent(q)}`, { cache: "no-store" })
      if (!response.ok) {
        setError("Не удалось загрузить список игроков.")
        return
      }
      setPlayers(await response.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load("")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const buildPayload = () => ({
    nickname: form.nickname,
    tag: form.tag || null,
    joinedOn: form.joinedOn || null,
    lastActiveOn: form.lastActiveOn || null,
    inactiveOn: form.inactiveOn || null,
    discordHandle: form.discordHandle || null,
    steamId: form.steamId || null,
    notes: form.notes || null,
    primaryRole: form.primaryRole === NONE ? null : form.primaryRole,
    secondaryRole: form.secondaryRole === NONE ? null : form.secondaryRole,
    specialization: form.specialization === NONE ? null : form.specialization,
    preferredFaction: form.preferredFaction === NONE ? null : form.preferredFaction,
    preferredMap: form.preferredMap === NONE ? null : form.preferredMap,
    serviceLengthText: form.serviceLengthText || null,
  })

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    const method = editingId ? "PUT" : "POST"
    const url = editingId ? `/api/admin/rest/admin/players/${editingId}` : "/api/admin/rest/admin/players"

    const response = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(buildPayload()),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      setError(payload?.error ?? "Не удалось сохранить игрока.")
      return
    }

    setEditingId(null)
    setForm(emptyForm())
    void load(query)
  }

  const handleEdit = (player: PlayerRow) => {
    setEditingId(player.playerId)
    setForm({
      nickname: player.nickname,
      tag: player.tag ?? "",
      joinedOn: player.joinedOn ?? "",
      lastActiveOn: player.lastActiveOn ?? "",
      inactiveOn: player.inactiveOn ?? "",
      discordHandle: player.discordHandle ?? "",
      steamId: player.steamId ?? "",
      notes: player.notes ?? "",
      primaryRole: player.primaryRole ?? NONE,
      secondaryRole: player.secondaryRole ?? NONE,
      specialization: player.specialization ?? NONE,
      preferredFaction: player.preferredFaction ?? NONE,
      preferredMap: player.preferredMap ?? NONE,
      serviceLengthText: player.serviceLengthText ?? "",
    })
  }

  const roleOptions = dictionaries?.roles ?? []
  const specializationOptions = dictionaries?.specializations ?? []
  const factionOptions = dictionaries?.factions ?? []
  const mapOptions = dictionaries?.maps ?? []

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-christmas-snow">Игроки</h1>

      {error && (
        <div className="rounded-md border border-christmas-red/40 bg-christmas-red/10 px-3 py-2 text-sm text-christmas-red">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{editingId ? `Редактировать игрока #${editingId}` : "Новый игрок"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-2 gap-3 md:grid-cols-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label>Никнейм</Label>
              <Input value={form.nickname} onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Тег</Label>
              <Input value={form.tag} onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Discord</Label>
              <Input value={form.discordHandle} onChange={(e) => setForm((f) => ({ ...f, discordHandle: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Steam ID</Label>
              <Input value={form.steamId} onChange={(e) => setForm((f) => ({ ...f, steamId: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Вступил</Label>
              <Input type="date" value={form.joinedOn} onChange={(e) => setForm((f) => ({ ...f, joinedOn: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Последняя активность</Label>
              <Input type="date" value={form.lastActiveOn} onChange={(e) => setForm((f) => ({ ...f, lastActiveOn: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Неактивен с</Label>
              <Input type="date" value={form.inactiveOn} onChange={(e) => setForm((f) => ({ ...f, inactiveOn: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Стаж (текст)</Label>
              <Input value={form.serviceLengthText} onChange={(e) => setForm((f) => ({ ...f, serviceLengthText: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <Label>Основная роль</Label>
              <Select value={form.primaryRole} onValueChange={(v) => setForm((f) => ({ ...f, primaryRole: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {roleOptions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Вторая роль</Label>
              <Select value={form.secondaryRole} onValueChange={(v) => setForm((f) => ({ ...f, secondaryRole: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {roleOptions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Специализация</Label>
              <Select value={form.specialization} onValueChange={(v) => setForm((f) => ({ ...f, specialization: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {specializationOptions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Любимая фракция</Label>
              <Select value={form.preferredFaction} onValueChange={(v) => setForm((f) => ({ ...f, preferredFaction: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {factionOptions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Любимая карта</Label>
              <Select value={form.preferredMap} onValueChange={(v) => setForm((f) => ({ ...f, preferredMap: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {mapOptions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-1.5 md:col-span-4">
              <Label>Заметки</Label>
              <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>

            <div className="col-span-2 flex gap-2 md:col-span-4">
              <Button type="submit">{editingId ? "Сохранить" : "Создать"}</Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={() => { setEditingId(null); setForm(emptyForm()) }}>
                  Отмена
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Список игроков</CardTitle>
          <div className="pt-2">
            <Input
              placeholder="Поиск по нику..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                void load(e.target.value)
              }}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Загрузка...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Никнейм</TableHead>
                  <TableHead>Тег</TableHead>
                  <TableHead>Роль</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.map((p) => (
                  <TableRow key={p.playerId}>
                    <TableCell>{p.nickname}</TableCell>
                    <TableCell>{p.tag ?? "—"}</TableCell>
                    <TableCell>{p.primaryRole ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(p)}>
                        Изменить
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
