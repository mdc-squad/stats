"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type FieldKey =
  | "icon"
  | "discordCode"
  | "flagText"
  | "discordEmoji"
  | "steamUrl"
  | "attendanceFactor"
  | "basePoints"
  | "weight"
  | "resultFactor"
  | "strengthFactor"
  | "ticketThreshold"

interface FieldConfig {
  key: FieldKey
  label: string
  type: "text" | "number"
}

interface TableConfig {
  label: string
  nameLabel: string
  fields: FieldConfig[]
}

const TABLE_CONFIG: Record<string, TableConfig> = {
  maps: { label: "Карты", nameLabel: "Название", fields: [] },
  modes: { label: "Режимы", nameLabel: "Название", fields: [] },
  factions: {
    label: "Фракции",
    nameLabel: "Код",
    fields: [
      { key: "flagText", label: "Флаг", type: "text" },
      { key: "discordEmoji", label: "Discord эмодзи", type: "text" },
    ],
  },
  "event-types": {
    label: "Типы событий",
    nameLabel: "Название",
    fields: [
      { key: "attendanceFactor", label: "Множитель посещаемости", type: "number" },
      { key: "basePoints", label: "Базовые очки", type: "number" },
    ],
  },
  roles: {
    label: "Роли",
    nameLabel: "Название",
    fields: [
      { key: "icon", label: "Иконка", type: "text" },
      { key: "discordCode", label: "Discord код", type: "text" },
    ],
  },
  specializations: {
    label: "Специализации",
    nameLabel: "Название",
    fields: [
      { key: "icon", label: "Иконка", type: "text" },
      { key: "discordCode", label: "Discord код", type: "text" },
    ],
  },
  vehicles: { label: "Техника", nameLabel: "Название", fields: [{ key: "icon", label: "Иконка", type: "text" }] },
  "squad-colors": { label: "Цвета отрядов", nameLabel: "Код", fields: [] },
  "metric-weights": {
    label: "Веса метрик",
    nameLabel: "Метрика",
    fields: [{ key: "weight", label: "Вес", type: "number" }],
  },
  results: {
    label: "Результаты",
    nameLabel: "Название",
    fields: [{ key: "resultFactor", label: "Множитель результата", type: "number" }],
  },
  "strength-categories": {
    label: "Категории силы",
    nameLabel: "Название",
    fields: [
      { key: "strengthFactor", label: "Множитель силы", type: "number" },
      { key: "ticketThreshold", label: "Порог тикетов", type: "number" },
    ],
  },
  mods: { label: "Моды", nameLabel: "Название", fields: [{ key: "steamUrl", label: "Steam URL", type: "text" }] },
}

const TABLE_KEYS = Object.keys(TABLE_CONFIG)

interface ReferenceItem {
  id: number
  name: string
  sortOrder: number
  icon?: string | null
  discordCode?: string | null
  flagText?: string | null
  discordEmoji?: string | null
  steamUrl?: string | null
  attendanceFactor?: number | null
  basePoints?: number | null
  weight?: number | null
  resultFactor?: number | null
  strengthFactor?: number | null
  ticketThreshold?: number | null
}

type DraftFields = Partial<Record<FieldKey, string>>

function emptyDraft(): { name: string; sortOrder: string; fields: DraftFields } {
  return { name: "", sortOrder: "0", fields: {} }
}

export default function DictionariesPage() {
  const [activeTable, setActiveTable] = useState(TABLE_KEYS[0])
  const [items, setItems] = useState<ReferenceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState(emptyDraft())
  const [editingId, setEditingId] = useState<number | null>(null)

  const config = TABLE_CONFIG[activeTable]

  const load = useMemo(
    () => async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/admin/rest/admin/dictionaries/${activeTable}`, { cache: "no-store" })
        if (!response.ok) {
          setError("Не удалось загрузить список.")
          return
        }
        setItems(await response.json())
      } finally {
        setLoading(false)
      }
    },
    [activeTable],
  )

  useEffect(() => {
    setDraft(emptyDraft())
    setEditingId(null)
    void load()
  }, [load])

  const buildPayload = () => {
    const payload: Record<string, unknown> = {
      id: editingId ?? 0,
      name: draft.name,
      sortOrder: Number(draft.sortOrder) || 0,
    }
    for (const field of config.fields) {
      const raw = draft.fields[field.key]
      if (raw === undefined || raw === "") continue
      payload[field.key] = field.type === "number" ? Number(raw) : raw
    }
    return payload
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    const method = editingId ? "PUT" : "POST"
    const url = editingId
      ? `/api/admin/rest/admin/dictionaries/${activeTable}/${editingId}`
      : `/api/admin/rest/admin/dictionaries/${activeTable}`

    const response = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(buildPayload()),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      setError(payload?.error ?? "Не удалось сохранить запись.")
      return
    }

    setDraft(emptyDraft())
    setEditingId(null)
    void load()
  }

  const handleEdit = (item: ReferenceItem) => {
    setEditingId(item.id)
    const fields: DraftFields = {}
    for (const field of config.fields) {
      const value = item[field.key]
      if (value !== null && value !== undefined) {
        fields[field.key] = String(value)
      }
    }
    setDraft({ name: item.name, sortOrder: String(item.sortOrder), fields })
  }

  const handleDelete = async (item: ReferenceItem) => {
    setError(null)
    const response = await fetch(`/api/admin/rest/admin/dictionaries/${activeTable}/${item.id}`, { method: "DELETE" })
    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      setError(payload?.error ?? "Не удалось удалить запись.")
      return
    }
    void load()
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-christmas-snow">Справочники</h1>

      <Tabs value={activeTable} onValueChange={setActiveTable}>
        <TabsList className="h-auto flex-wrap justify-start gap-1">
          {TABLE_KEYS.map((key) => (
            <TabsTrigger key={key} value={key}>
              {TABLE_CONFIG[key].label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {error && (
        <div className="rounded-md border border-christmas-red/40 bg-christmas-red/10 px-3 py-2 text-sm text-christmas-red">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{editingId ? "Редактировать запись" : "Добавить запись"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-3" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label>{config.nameLabel}</Label>
              <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} required />
            </div>
            <div className="w-28 space-y-1.5">
              <Label>Сортировка</Label>
              <Input
                type="number"
                value={draft.sortOrder}
                onChange={(e) => setDraft((d) => ({ ...d, sortOrder: e.target.value }))}
              />
            </div>
            {config.fields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label>{field.label}</Label>
                <Input
                  type={field.type}
                  value={draft.fields[field.key] ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, fields: { ...d.fields, [field.key]: e.target.value } }))}
                />
              </div>
            ))}
            <Button type="submit">{editingId ? "Сохранить" : "Добавить"}</Button>
            {editingId && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingId(null)
                  setDraft(emptyDraft())
                }}
              >
                Отмена
              </Button>
            )}
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
                  <TableHead>{config.nameLabel}</TableHead>
                  <TableHead>Сортировка</TableHead>
                  {config.fields.map((field) => (
                    <TableHead key={field.key}>{field.label}</TableHead>
                  ))}
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.sortOrder}</TableCell>
                    {config.fields.map((field) => (
                      <TableCell key={field.key}>{item[field.key] ?? "—"}</TableCell>
                    ))}
                    <TableCell className="space-x-2 text-right">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
                        Изменить
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(item)}>
                        Удалить
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
