"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface AdminUserRow {
  adminUserId: number
  displayName: string
  discordUserId: string | null
  username: string | null
  role: string
  isActive: boolean
  createdAt: string
  lastLoginAt: string | null
}

function emptyForm() {
  return { displayName: "", role: "Editor", discordUserId: "", username: "", password: "" }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm())

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/rest/admin/users", { cache: "no-store" })
      if (!response.ok) {
        setError(response.status === 403 ? "Доступно только для SuperAdmin." : "Не удалось загрузить список.")
        return
      }
      setUsers(await response.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    const response = await fetch("/api/admin/rest/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        displayName: form.displayName,
        role: form.role,
        discordUserId: form.discordUserId || null,
        username: form.username || null,
        password: form.password || null,
      }),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      setError(payload?.error ?? "Не удалось создать пользователя.")
      return
    }

    setForm(emptyForm())
    void load()
  }

  const handleDeactivate = async (userId: number) => {
    setError(null)
    const response = await fetch(`/api/admin/rest/admin/users/${userId}`, { method: "DELETE" })
    if (!response.ok) {
      setError("Не удалось деактивировать пользователя.")
      return
    }
    void load()
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-christmas-snow">Пользователи админ-панели</h1>

      {error && (
        <div className="rounded-md border border-christmas-red/40 bg-christmas-red/10 px-3 py-2 text-sm text-christmas-red">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Добавить администратора</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-3" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label>Имя</Label>
              <Input value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} required />
            </div>
            <div className="w-40 space-y-1.5">
              <Label>Роль</Label>
              <Select value={form.role} onValueChange={(role) => setForm((f) => ({ ...f, role }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Editor">Editor</SelectItem>
                  <SelectItem value="SuperAdmin">SuperAdmin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Discord ID (опционально)</Label>
              <Input value={form.discordUserId} onChange={(e) => setForm((f) => ({ ...f, discordUserId: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Логин (опционально)</Label>
              <Input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Пароль</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            </div>
            <Button type="submit">Создать</Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">Нужно указать Discord ID, логин с паролем — или оба варианта.</p>
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
                  <TableHead>Имя</TableHead>
                  <TableHead>Роль</TableHead>
                  <TableHead>Discord ID</TableHead>
                  <TableHead>Логин</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.adminUserId}>
                    <TableCell>{u.displayName}</TableCell>
                    <TableCell>{u.role}</TableCell>
                    <TableCell>{u.discordUserId ?? "—"}</TableCell>
                    <TableCell>{u.username ?? "—"}</TableCell>
                    <TableCell>{u.isActive ? "Активен" : "Отключен"}</TableCell>
                    <TableCell className="text-right">
                      {u.isActive && (
                        <Button size="sm" variant="outline" onClick={() => handleDeactivate(u.adminUserId)}>
                          Деактивировать
                        </Button>
                      )}
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
